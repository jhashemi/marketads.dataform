# MATERIALIZED VIEWS SCHEMA

```CREATE MATERIALIZED VIEW `local-dimension-296708.onpointdata.email_rdids`
CLUSTER BY email
OPTIONS(
  allow_non_incremental_definition=true,
  max_staleness=INTERVAL '0-0 0 72:0:0' YEAR TO SECOND
)
AS with rdid as (
SELECT
group_id, candidates
FROM `local-dimension-296708.onpointdata.grouped_edges` g
where
'rdid' in (select node_type from unnest(g.candidates) where node_type='rdid')),
email as (
  SELECT
group_id, candidates
FROM `local-dimension-296708.onpointdata.grouped_edges` g
where
'email' in (select node_type from unnest(g.candidates) where node_type='email')
)
select
case when (REGEXP_CONTAINS(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'), r'@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')) then
  CONCAT(
    -- Remove accents, special characters, and consecutive dots from user part
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        -- Remove accents
        NORMALIZE(TRIM( REGEXP_REPLACE(SPLIT(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'), '@')[safe_OFFSET(0)], r'\.\.+', '.'),'.'), NFD),
        r'[^\x20-\x7E]', ''
      ),
      r'\.\.+', '.'
    ),
    '@',
    -- Normalize domain and TLD
    CASE
      WHEN ARRAY_LENGTH(SPLIT(SPLIT(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'), '@')[safe_OFFSET(1)], '.')) > 1 THEN
        CONCAT(SPLIT(SPLIT(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'), '@')[safe_OFFSET(1)], '.')[safe_OFFSET(0)]
          -- Closest domain

          ,
          '.',
          -- Closest TLD

            SPLIT(SPLIT(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'), '@')[safe_OFFSET(1)], '.')[safe_OFFSET(1)]


        )
      ELSE
        -- Only TLD
        SPLIT(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'), '@')[safe_OFFSET(1)]
    END
  )
  else NORMALIZE_AND_CASEFOLD(REGEXP_REPLACE(em.node_value,r'(\+\w+)(@)', r'\2'),NFD) end

 as email, ARRAY_AGG(distinct safe_cast(rc.node_value as integer) ignore nulls limit 100) as rdids
from rdid
inner join email
on rdid.group_id = email.group_id, unnest(rdid.candidates) rc,unnest(email.candidates) em
where rc.node_type='rdid' and em.node_type='email'
group by email
having array_length(rdids)<25;
-------------

CREATE MATERIALIZED VIEW `local-dimension-296708.onpointdata.hem_personphone`
CLUSTER BY SHA256_LC_HEM
OPTIONS(
  description="Crosswalk for sha256 hashed e-mail addresses to person-phone identifiers. person-phone is of the format lastname:firstname:8005551212",
  allow_non_incremental_definition=true,
  max_staleness=INTERVAL '0-0 2 0:0:0' YEAR TO SECOND
)
AS with email as (
SELECT
group_id, candidates
FROM `local-dimension-296708.onpointdata.grouped_edges` g
where
'email' in (select node_type from unnest(g.candidates) where node_type='email')),
phone as (
  SELECT
group_id, candidates
FROM `local-dimension-296708.onpointdata.grouped_edges` g
where
'person-phone' in (select node_type from unnest(g.candidates) where node_type='person-phone')
),
final as (
select rc.node_value as email, ARRAY_AGG(distinct REGEXP_REPLACE(em.node_value,r'(1|)(\d{10})','\\2')   ignore nulls limit 100) as phones
from email
inner join phone
on email.group_id = phone.group_id, unnest(email.candidates) rc,unnest(phone.candidates) em
where rc.node_type='email' and em.node_type='person-phone' and not(left(em.node_value,1) ='+')
group by email
having array_length(phones)<5
)
  select to_hex(sha256(email)) as SHA256_LC_HEM,phones from final;
--------
CREATE MATERIALIZED VIEW `local-dimension-296708.onpointdata.hem_linkedin`
CLUSTER BY SHA256_LC_HEM
OPTIONS(
  description="Crosswalk for sha256 hashed e-mail addresses to facebook uid identifiers",
  allow_non_incremental_definition=true,
  max_staleness=INTERVAL '0-0 2 0:0:0' YEAR TO SECOND
)
AS with email as (
SELECT
group_id, candidates
FROM `local-dimension-296708.onpointdata.grouped_edges` g
where
'email' in (select node_type from unnest(g.candidates) where node_type='email')),
phone as (
  SELECT
group_id, candidates
FROM `local-dimension-296708.onpointdata.grouped_edges` g
where
'linkedin:url' in (select node_type from unnest(g.candidates) where node_type='linkedin:url')
),
final as (
select rc.node_value as email, ARRAY_AGG(distinct em.node_value   ignore nulls limit 4) as phones
from email
inner join phone
on email.group_id = phone.group_id, unnest(email.candidates) rc,unnest(phone.candidates) em
where rc.node_type='email' and em.node_type='linkedin:url'
group by email
having array_length(phones)<5
)
  select to_hex(sha256(email)) as SHA256_LC_HEM,phones as linkedin_profile from final;