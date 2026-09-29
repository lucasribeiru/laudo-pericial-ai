# Security Specification: Visum Social Firestore ABAC Rules

## 1. Data Invariants

1. **User Isolation**: Perícias belong strictly to the authenticated forensic social worker (`userId`). No user may read, list, update, or delete another user's forensic evaluations.
2. **Identity Integrity**: Incoming `userId` on creation or update must strictly equal `request.auth.uid`. Spoofing ownership is prohibited.
3. **Immutability of Key Identification**: Document path `userId` is permanent. `createdAt` cannot be modified after initial write.
4. **Input Size Limits**: All string fields are constrained in length (e.g. `nome_periciado` <= 200, `numero_processo` <= 100, `userId` <= 128) to prevent denial-of-wallet resource attacks.
5. **No Blanket Access**: Every read/list operation explicitly requires the user to be signed in and matches `request.auth.uid`.

---

## 2. The Dirty Dozen Payloads (Security Attack Vectors)

1. **Unauthenticated Read**: Attempting to read `/users/user123/pericias/pericia1` with `request.auth = null`.
   - *Expected*: `PERMISSION_DENIED`
2. **Cross-Tenant Read**: User B attempting to read `/users/userA/pericias/doc1`.
   - *Expected*: `PERMISSION_DENIED`
3. **Cross-Tenant Write**: User B attempting to create `/users/userA/pericias/doc1`.
   - *Expected*: `PERMISSION_DENIED`
4. **Identity Spoofing**: User A attempting to create `/users/userA/pericias/doc1` with payload `{ userId: 'userB' }`.
   - *Expected*: `PERMISSION_DENIED`
5. **Blanket Query Scraping**: Attempting to query `/pericias` across all users.
   - *Expected*: `PERMISSION_DENIED`
6. **Path Traversal / Malformed Document ID**: Attempting to target document ID containing path traversal `../admin`.
   - *Expected*: `PERMISSION_DENIED`
7. **Giant String Injection (Denial of Wallet)**: Submitting `nome_periciado` with 5MB of junk data.
   - *Expected*: `PERMISSION_DENIED`
8. **Ghost Field Injection**: Adding arbitrary admin fields (e.g., `{ isAdmin: true }`) to the user profile or report document.
   - *Expected*: `PERMISSION_DENIED`
9. **Status Bypass / Terminal State Corruption**: Overwriting immutable audit fields like `createdAt`.
   - *Expected*: `PERMISSION_DENIED`
10. **Unauthenticated Profile Access**: Non-logged in client reading `/users/userA`.
    - *Expected*: `PERMISSION_DENIED`
11. **Malicious User Profile Overwrite**: User B writing to `/users/userA`.
    - *Expected*: `PERMISSION_DENIED`
12. **Catch-All Wildcard Exploit**: Accessing unmapped collection `/system_secrets/test`.
    - *Expected*: `PERMISSION_DENIED`
