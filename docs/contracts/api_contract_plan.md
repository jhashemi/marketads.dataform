# API Contract Construction Plan

## 1. Define API Boundaries:
    - Identify the different contexts or modules within the application that will interact with external systems or other modules.
    - For each boundary, determine the services and data that will be exposed through the API.
    - Create a C4 Context diagram to visualize the system boundaries and external interactions.

## 2. Define Contract Types:
    - Determine the types of contracts needed for each API boundary. This might include:
        - Request/Response schemas (e.g., JSON schemas)
        - Data validation rules
        - Error handling specifications
        - Authentication/Authorization protocols
    - Consider using Protocol Buffers or OpenAPI specifications for defining contracts.

## 3. Document Contracts:
    - Create markdown files in `docs/contracts` to document each API boundary contract.
    - For each contract, include:
        - Description of the API boundary and its purpose
        - Contract type (e.g., Request/Response schema)
        - Schema definition (e.g., JSON schema or Protobuf definition)
        - Example requests and responses
        - Error codes and messages
        - Authentication/Authorization details

## 4. Generate ADRs:
    - Create Architecture Decision Records (ADRs) in `docs/adr` to document the decisions made during the contract design process.
    - ADRs should include:
        - Context of the decision
        - Decision made
        - Consequences of the decision

## 5. Review and Refine:
    - Review the documented contracts with stakeholders to ensure they meet the requirements and are aligned with the system architecture.
    - Refine the contracts based on feedback and iterate until they are finalized.

## Mermaid Diagrams:

**C4 Context Diagram:**

```mermaid
C4Context
    Enterprise_Boundary(b1, "MarketAds Dataform") {
        System(System, "Dataform Service", "Core data processing and matching service")
    }

    System_Ext(ExternalSystem, "External API", "Third-party API for data enrichment")
    System_Ext(User, "User", "Internal users and external clients")

    Rel(User, System, "Uses", "API Requests")
    Rel(System, ExternalSystem, "Uses", "Data Enrichment")