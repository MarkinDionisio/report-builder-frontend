# Organization administration layout

This supplements the required [interface and behavior guide](ui-patterns.md). Follow its layout, padding, actions, modals, states, and accessibility throughout the frontend. This document covers organization-specific details.

| Screen | Context and content |
|---|---|
| Organizations | Heading, creation action, cards with primary/secondary actions |
| Selected organization | Shared header, breadcrumbs, Fontes de dados / Profiles de acesso areas |
| Members | Organization header, section title, add/invite action |
| Invitations | Organization header, invitation query, per-item actions |
| Direct profile access | Organization header, fixed organization, no redundant organization column in mobile cards |
| Direct permissions access | Organization header, profile name as title, preserved existing grants |
| Source configuration | Source title, organization breadcrumb, shared limits/padding, accessible steps/footer actions |
| Models within source | Embedded editors without repeated sidebar or main page title |

OrganizationContextHeader centralizes identity/navigation/Membros e convites. Reuse session/loaded organization names or fetch the organization on authorized direct access.

Member/invitation/profile tables retain organization context on mobile. Grant read failures block editing until a fresh read; editing one source preserves other source grants. Reuse OrganizationContextHeader, administrative styles, ConfirmDeleteModal, and [source configuration](data-source-configuration.md).

Designer/runner retain their own workflow structures. Browser validation compares width/position/padding across direct entry points and checks organization identity, navigation, modals, and absence of page horizontal scrolling. Integration tests use simulated responses.
