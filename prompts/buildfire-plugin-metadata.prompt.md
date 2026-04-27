You are running inside the root folder of an existing BuildFire plugin.

Your task is to deeply scan the entire plugin codebase and generate exactly these three files under the plugin root ".buildfire/" folder:

1. .buildfire/plugin.plan.json
2. .buildfire/plugin.index.json
3. .buildfire/plugin.mcp.json

These files are generated BuildFire metadata files.
Do not treat them as runtime plugin files.

These files are Plugin Studio memory files used by BuildFire AI, MCP workflows, future code generation, future code updates, and safe plugin data operations.

Their purpose:

- .buildfire/plugin.plan.json:
  Deep architectural memory for Plugin Studio, future code generation, future code updates, and safe maintenance.

- .buildfire/plugin.index.json:
  Compact semantic file manifest so AI can quickly understand what files exist and which files may need to be read for future updates.

- .buildfire/plugin.mcp.json:
  Compact MCP-safe data operation contract so AI tools can safely read, create, update, remove, archive, reorder, and manage plugin data without needing the full architecture every time.

This is a MUST:
- Read all relevant files deeply.
- Understand the real implemented architecture.
- Understand how the plugin stores and manages data.
- Understand widget behavior.
- Understand control panel behavior.
- Understand BuildFire SDK usage.
- Understand datastore keys, schemas, settings, content models, and user-facing data.
- All outputs must be grounded in real code evidence.
- Every datastore key, schema, and behavior must be traceable to actual files.
- If not traceable, mark as low confidence.
- Recognize BuildFire patterns:
  - buildfire.datastore.get / save / insert / search
  - buildfire.components
  - buildfire.auth
  - buildfire.navigation
  - buildfire.analytics
- Do NOT redesign the plugin.
- Do NOT idealize the architecture.
- Do NOT invent behavior.
- Do NOT invent datastore keys.
- Do NOT invent fields.
- Do NOT generate shallow summaries.
- Do NOT modify existing source code.
- Only create or replace:
  - .buildfire/plugin.plan.json
  - .buildfire/plugin.index.json
  - .buildfire/plugin.mcp.json

Scan these files if they exist:
- plugin.json
- widget/**
- control/**
- resources/**
- any JS files
- any HTML files
- any CSS files
- any JSON files
- any MD files
- any YAML/YML files
- any helper/lib files used by widget or control

Scan strategy:
- Start from plugin.json to understand structure.
- Identify widget entry points.
- Identify control panel entry points: content, design, settings.
- Trace data flow from control → datastore → widget.
- Identify BuildFire SDK usage points.
- Build a mental architecture map before generating output.

Ignore:
- .buildfire/**
- ai/**
- node_modules
- dist
- build
- .git
- source maps
- binary files
- png, jpg, jpeg, gif, webp, ico, zip, mp4, mov, avi, woff, woff2, ttf
- generated output folders
- logs
- coverage folders
- temporary files

Important:
If a field, datastore key, schema, or operation is uncertain, mark it as uncertain using:
{
  "confidence": "low",
  "notes": ["Reason this is uncertain"]
}

Do NOT guess silently.

If any behavior, schema, or data flow is not clearly supported by code evidence:
- Do NOT infer it as fact.
- Mark it with confidence: "low".
- Add explicit notes explaining the uncertainty.
- Prefer omission over hallucination.

Priority order:
1. Understand data layer: datastore, settings, content.
2. Understand execution flows.
3. Map files and dependencies.
4. Generate .buildfire/plugin.plan.json.
5. Generate .buildfire/plugin.index.json.
6. Generate .buildfire/plugin.mcp.json.

Output quality rules:
- Be detailed but not redundant.
- Avoid repeating the same explanation across sections.
- Prefer structured, precise language over long paragraphs.
- Keep .buildfire/plugin.index.json compact and efficient.
- Keep .buildfire/plugin.mcp.json strict, compact, and operation-focused.
- Keep source/evidence/file-level details in .buildfire/plugin.plan.json and .buildfire/plugin.index.json.
- Do not put source file references in .buildfire/plugin.mcp.json unless absolutely required for data safety.

============================================================
FILE 1: .buildfire/plugin.plan.json
============================================================

plugin.plan.json is the deep architectural brain of the plugin.

It must allow another AI session to understand:
- what the plugin does
- how it works internally
- how widget and control sides interact
- how files interact
- where logic lives
- what data structures exist
- what must not change
- how updates should be done safely

plugin.plan.json MUST be implementation-aware and update-safe.

Create .buildfire/plugin.plan.json with this exact top-level structure:

{
  "schemaVersion": "1.0.0",
  "generatedAt": "",
  "updatedAt": "",
  "pluginPurpose": "",
  "businessGoal": "",
  "architectureOverview": "",
  "designPrinciples": [],
  "runtimeSurfaces": {
    "widget": {
      "exists": true,
      "purpose": "",
      "entrypoints": [],
      "mainResponsibilities": []
    },
    "control": {
      "exists": true,
      "enabledSections": [],
      "purpose": "",
      "entrypoints": [],
      "mainResponsibilities": []
    },
    "resources": {
      "exists": true,
      "purpose": "",
      "importantFiles": []
    }
  },
  "executionFlows": [],
  "dataContracts": [],
  "fileMap": [],
  "integrationPoints": [],
  "constraints": [],
  "updateGuidance": [],
  "extensionPoints": [],
  "mcpSummary": {
    "hasMcpContract": true,
    "mcpContractFile": ".buildfire/plugin.mcp.json",
    "dataOperationsSupported": [],
    "primaryDataStores": []
  },
  "aiContext": {
    "criticalFlows": [],
    "safeToModify": [],
    "highRiskAreas": [],
    "safeRefactorZones": [],
    "antiPatterns": []
  }
}

Rules for .buildfire/plugin.plan.json:

1. pluginPurpose
Explain clearly what the plugin does from both:
- admin/control panel perspective
- end-user/widget perspective

2. businessGoal
Explain what user/business problem this plugin solves.

3. architectureOverview
Explain the real architecture:
- widget responsibilities
- control panel responsibilities
- datastore/data ownership
- initialization flow
- rendering flow
- save/load flow
- major runtime flows
- how files work together
- what depends on what

4. designPrinciples
List real architectural/design principles used by the plugin:
- separation of widget/control
- state management approach
- BuildFire SDK usage patterns
- datastore ownership
- UI rendering approach
- validation approach
- maintainability decisions
- backward compatibility decisions

5. runtimeSurfaces
Describe each runtime surface:
- widget
- control/content
- control/design
- control/settings
- resources

For each, include:
- whether it exists
- purpose
- entry files
- main responsibilities

6. executionFlows
For each important flow, include:

{
  "name": "",
  "trigger": "",
  "steps": [],
  "filesInvolved": [],
  "dataMovement": "",
  "failureHandling": [],
  "result": "",
  "confidence": "high | medium | low",
  "notes": []
}

Include flows such as:
- widget initialization
- control initialization
- datastore load
- datastore save
- settings save
- content save
- design save
- widget rendering
- user interaction
- form submission if applicable
- validation
- navigation
- authentication if applicable
- data sync if applicable
- any plugin-specific important behavior

7. dataContracts
For each important data structure, include:

{
  "name": "",
  "purpose": "",
  "usedBy": [],
  "ownedBy": "widget | control | shared | external",
  "storage": {
    "type": "buildfire.datastore | localStorage | externalApi | inMemory | unknown",
    "key": "",
    "collection": "",
    "scope": "app | user | global | instance | unknown"
  },
  "schema": {
    "fieldName": {
      "type": "string | number | boolean | array | object | date | enum | unknown",
      "required": true,
      "description": "",
      "default": null,
      "allowedValues": [],
      "example": ""
    }
  },
  "validation": [],
  "example": {},
  "backwardCompatibilityNotes": [],
  "confidence": "high | medium | low",
  "notes": []
}

Include:
- datastore records
- settings objects
- content objects
- design objects
- user input models
- SDK callback response shapes if used
- internal state objects
- records that MCP may need to manage

8. fileMap
Every important source file MUST be listed.

Each fileMap entry MUST include:

{
  "path": "",
  "purpose": "",
  "responsibilities": [],
  "interactions": [],
  "dependencies": [],
  "dependents": [],
  "executionRole": "startup | ui | data | logic | integration | configuration | asset | documentation",
  "runtimeSurface": "widget | control-content | control-design | control-settings | shared | resources | root",
  "updateRisks": [],
  "safeToModifyAreas": [],
  "contracts": [],
  "mcpRelevance": {
    "relevantToDataOperations": true,
    "reason": ""
  },
  "confidence": "high | medium | low",
  "notes": []
}

Rules for fileMap:
- Be specific.
- Explain why the file exists.
- Explain what logic the file owns.
- Explain what files or runtime flows depend on it.
- Explain what can break if changed incorrectly.
- Explain where future updates should be made.
- Do NOT use generic phrases like "handles UI" or "main logic".

9. integrationPoints
List BuildFire SDK usage and any external/internal integrations:

{
  "name": "",
  "type": "buildfire-sdk | browser-api | external-api | storage | auth | analytics | notification | other",
  "purpose": "",
  "files": [],
  "contracts": "",
  "dataTouched": [],
  "mcpImpact": "",
  "notes": []
}

Examples:
- buildfire.datastore
- buildfire.auth
- buildfire.navigation
- buildfire.components
- buildfire.analytics
- localStorage/sessionStorage
- Firebase
- external APIs

10. constraints
Hard rules future AI must not violate:

{
  "rule": "",
  "reason": "",
  "impact": "",
  "appliesTo": []
}

Include:
- SDK load order
- widget/control separation
- plugin.json structure
- datastore schema compatibility
- file naming expectations
- DOM hooks relied on by JS
- data backward compatibility requirements
- MCP data safety requirements

11. updateGuidance
Future-safe update instructions:

{
  "scenario": "",
  "recommendedApproach": "",
  "filesLikelyAffected": [],
  "dataContractsAffected": [],
  "mcpContractsAffected": [],
  "risks": [],
  "requiresHumanReview": true
}

Include scenarios like:
- adding a new setting
- changing widget UI
- changing control UI
- changing datastore schema
- adding validation
- adding SDK integration
- modifying plugin.json
- changing assets/resources
- adding MCP operation support
- changing plugin data schema

12. extensionPoints
Where new features can be safely added:

{
  "area": "",
  "howToExtend": "",
  "files": [],
  "whereNotToAdd": [],
  "dataImpact": "",
  "mcpImpact": ""
}

13. mcpSummary
Summarize what MCP should care about:
- primary data stores
- supported data operations
- whether .buildfire/plugin.mcp.json exists
- whether MCP can safely manage this plugin data

14. aiContext
This is only for future AI maintainers.

Include:
- criticalFlows: flows that must never break
- safeToModify: files/areas that are generally safe
- highRiskAreas: files/areas that require extra care
- safeRefactorZones: areas that can be cleaned up with lower risk
- antiPatterns: things future AI must never do

============================================================
FILE 2: .buildfire/plugin.index.json
============================================================

plugin.index.json is a compact semantic manifest.

It should be much smaller than plugin.plan.json.

Its purpose:
- let AI quickly know what files exist
- let AI decide what files to request/read
- provide quick lookup for file purpose and risk
- avoid sending full plugin.plan.json every time

Create .buildfire/plugin.index.json with this exact top-level structure:

{
  "schemaVersion": "1.0.0",
  "generatedAt": "",
  "updatedAt": "",
  "plugin": {
    "name": "",
    "description": "",
    "pluginJsonPath": "plugin.json",
    "hasWidget": true,
    "hasControl": true,
    "enabledControlSections": [],
    "hasMcpContract": true,
    "mcpContractPath": ".buildfire/plugin.mcp.json"
  },
  "counts": {
    "total": 0,
    "widget": 0,
    "control": 0,
    "resources": 0,
    "root": 0,
    "helper": 0,
    "config": 0,
    "mcpRelevant": 0
  },
  "files": []
}

Each files entry MUST include:

{
  "path": "",
  "type": "widget | control | resource | root | helper | config | documentation",
  "runtimeSurface": "widget | control-content | control-design | control-settings | shared | resources | root",
  "executionRole": "",
  "purpose": "",
  "dependencies": [],
  "interactions": [],
  "contracts": [],
  "dataContracts": [],
  "mcpRelevant": true,
  "mcpReason": "",
  "updateRisk": "low | medium | high",
  "safeToModify": true
}

Rules:
- Include every important source/config file.
- Use exact relative paths.
- Keep descriptions compact.
- This is a manifest, not the full architecture.
- Do not duplicate all plugin.plan.json details.
- Mark files involved in datastore/data operations as mcpRelevant: true.

============================================================
FILE 3: .buildfire/plugin.mcp.json
============================================================

plugin.mcp.json is the most important file for MCP.

It must be optimized for AI tools that need to safely manage plugin data.

The MCP should be able to use plugin.mcp.json to understand:
- what data exists
- where data is stored
- what schema each record uses
- what fields are required
- what fields are safe to update
- what fields should never be touched
- how to create records
- how to update records
- how to remove/archive/reorder records
- what human confirmation is required
- how to avoid breaking the plugin

plugin.mcp.json MUST be compact, strict, and operation-focused.

Do NOT include full UI architecture here.
Do NOT include CSS details.
Do NOT include long file explanations.
Do NOT include sourceFiles.
Do NOT include implementation file references unless absolutely required for data safety.
Do NOT make this heavy.

The MCP file should answer only:
- What data can be managed?
- Where is it stored?
- What fields exist?
- Which fields are safe or dangerous?
- What operations are allowed?
- What operations require confirmation?
- What operations are unsupported?
- What matching rules prevent updating the wrong record?
- What write strategy avoids data loss?
- What example inputs are safe or unsafe?

Source code evidence belongs in .buildfire/plugin.plan.json and .buildfire/plugin.index.json, not in .buildfire/plugin.mcp.json.

STRICT SAFETY MODE:

If confidence is not "high":
- Disable write operations.
- Require human confirmation for all updates.
- Do not allow destructive remove/delete operations.

Never allow:
- schema changes
- destructive operations
- identity field modification
without explicit confirmation.

Create .buildfire/plugin.mcp.json with this exact top-level structure:

{
  "schemaVersion": "1.0.0",
  "generatedAt": "",
  "updatedAt": "",
  "plugin": {
    "name": "",
    "description": "",
    "purpose": "",
    "pluginJsonPath": "plugin.json"
  },
  "mcpPurpose": "Defines safe AI/MCP operations for managing this plugin's data.",
  "toolSummary": {
    "primaryUseCases": [],
    "safeDefaultBehavior": "",
    "mustAskBefore": [],
    "neverDo": []
  },
  "dataStores": [],
  "operations": [],
  "permissions": {
    "canCreate": true,
    "canRead": true,
    "canUpdate": true,
    "canRemove": false,
    "removeMode": "disabled | soft_remove | hard_remove | unknown"
  },
  "globalValidationRules": [],
  "aiSafetyRules": [],
  "humanConfirmationRequiredFor": [],
  "unsupportedOperations": [],
  "examples": {
    "safeCreate": [],
    "safeUpdate": [],
    "safeRemove": [],
    "unsafeRequests": []
  },
  "confidence": "high | medium | low",
  "notes": []
}

toolSummary MUST be optimized for ChatGPT App / MCP usage.

toolSummary fields:
- primaryUseCases:
  Short list of user-facing actions MCP can safely help with.
- safeDefaultBehavior:
  One sentence explaining the safest default write behavior.
- mustAskBefore:
  Short list of actions that require user confirmation.
- neverDo:
  Short list of actions MCP must never perform automatically.

dataStores entries MUST use this structure:

{
  "name": "",
  "description": "",
  "buildfireApi": "buildfire.datastore | unknown",
  "storageKey": "",
  "collection": "",
  "recordType": "",
  "ownership": "app | user | global | instance | unknown",
  "writeStrategy": "read_merge_save | insert_record | update_record | unknown",
  "conflictHandling": {
    "readBeforeWrite": true,
    "preserveUnknownFields": true,
    "detectChangedSincePreview": true,
    "onConflict": "ask_user"
  },
  "schema": {
    "fieldName": {
      "type": "string | number | boolean | array | object | date | enum | unknown",
      "required": true,
      "description": "",
      "default": null,
      "allowedValues": [],
      "example": "",
      "safeToUpdate": true,
      "readOnly": false,
      "dangerous": false
    }
  },
  "requiredFields": [],
  "optionalFields": [],
  "readOnlyFields": [],
  "safeToUpdateFields": [],
  "dangerousFields": [],
  "identityFields": [],
  "displayFields": [],
  "systemManagedFields": [],
  "validationRules": [
    {
      "field": "",
      "rule": "",
      "reason": "",
      "errorMessage": ""
    }
  ],
  "createRules": [],
  "updateRules": [],
  "removeRules": [],
  "relationships": [
    {
      "field": "",
      "references": "",
      "relationshipType": "one-to-one | one-to-many | many-to-many | unknown",
      "notes": ""
    }
  ],
  "examples": {
    "create": {},
    "update": {},
    "read": {},
    "remove": {}
  },
  "confidence": "high | medium | low",
  "notes": []
}

writeStrategy rules:
- Use "read_merge_save" when the plugin stores a shared object and writes require reading the current object, merging requested changes, preserving unknown fields, and saving the full object back.
- Use "insert_record" when the plugin creates separate records using insert-style behavior.
- Use "update_record" when the plugin updates individual records without replacing shared parent data.
- Use "unknown" when write behavior is unclear.
- If writeStrategy is "read_merge_save", MCP must never save a partial object that could erase unrelated fields.

conflictHandling rules:
- readBeforeWrite should be true for all writable stores unless the code clearly supports direct isolated writes.
- preserveUnknownFields should be true unless the schema explicitly says unknown fields should be dropped.
- detectChangedSincePreview should be true for operations requiring confirmation, preview, identity changes, remove, reorder, or bulk update.
- onConflict should usually be "ask_user".

operations entries MUST use this structure:

{
  "name": "",
  "description": "",
  "operationType": "create | read | update | remove | archive | reorder | bulk_update | bulk_remove | unknown",
  "availability": "allowed | allowed_with_confirmation | unsupported",
  "targetStore": "",
  "requiredInput": {},
  "optionalInput": {},
  "validation": [],
  "safetyRules": [],
  "fieldsAllowedToChange": [],
  "fieldsNotAllowedToChange": [],
  "requiresHumanConfirmation": false,
  "dryRunRequired": false,
  "matchingRules": {
    "preferredMatchFields": [],
    "allowIndexMatch": false,
    "requiresUniqueMatch": true,
    "ifMultipleMatches": "ask_user",
    "ifNoMatch": "ask_user"
  },
  "successResult": "",
  "failureCases": [],
  "resultShape": {
    "success": "boolean",
    "message": "string",
    "changedFields": "array",
    "preview": "object"
  },
  "exampleUserRequests": [],
  "exampleToolInput": {},
  "confidence": "high | medium | low",
  "notes": []
}

operation availability rules:
- Use "allowed" only when the operation is safe to perform without additional human confirmation.
- Use "allowed_with_confirmation" when the operation can be performed only after user confirmation.
- Use "unsupported" when the operation should not be performed by MCP.

dryRunRequired rules:
- Set dryRunRequired true for remove, archive, reorder, bulk_update, bulk_remove, identity field changes, schema-risk changes, or any operation with medium/low confidence.
- Dry run means MCP should preview exactly what will change before applying the operation.

matchingRules rules:
- For read/list operations, matchingRules can remain empty if not needed.
- For update/remove/reorder/bulk operations, define how MCP should identify records safely.
- preferredMatchFields should use real schema fields only.
- allowIndexMatch should be true only if array index is acceptable and current data is previewed first.
- requiresUniqueMatch should usually be true.
- ifMultipleMatches should usually be "ask_user".
- ifNoMatch should usually be "ask_user".

resultShape rules:
- Keep resultShape generic and stable.
- The MCP tool should be able to return success, message, changedFields, and preview consistently.
- For read operations, preview may contain the returned data or summary.

Rules for .buildfire/plugin.mcp.json:

1. No source file references
Do not include sourceFiles in .buildfire/plugin.mcp.json.

The MCP file is not an architecture file.
The MCP file is not a file evidence file.
The MCP file is a compact data-operation contract.

If source evidence is needed, place it in:
- .buildfire/plugin.plan.json fileMap, dataContracts, executionFlows, or integrationPoints
- .buildfire/plugin.index.json files

Only include implementation details in plugin.mcp.json if they directly affect data safety.

2. Data stores
Identify every datastore/data structure the plugin uses.

For BuildFire datastore usage, capture:
- datastore key/name
- whether data appears app-level, user-level, global, or instance-level
- schema
- required fields
- optional fields
- read-only fields
- safe update fields
- dangerous fields
- display fields
- identity fields
- write strategy
- conflict handling

3. Safe create
For each data type that can be created:
- define required input
- define default values
- define validation
- define example create payload
- define availability
- define whether human confirmation is needed
- define whether dry run is needed

4. Safe update
For each data type that can be updated:
- define how to identify the record
- define matching rules
- define which fields can be changed
- define which fields must not be changed
- define validation
- define example update payload
- preserve backward compatibility
- preserve unknown fields
- define conflict handling

5. Safe remove/archive
Be conservative.

Use "remove" instead of "delete" unless the plugin clearly supports a safe delete model.

If the plugin does not clearly support safe remove/archive:
- set canRemove false
- set removeMode "disabled"
- add remove/hard_remove to humanConfirmationRequiredFor
- add hard_remove to unsupportedOperations or mark as requiresHumanConfirmation

If remove is supported only by removing an item from an array:
- treat it as destructive
- require human confirmation
- require dryRunRequired true
- require a preview of the exact item to be removed
- require matchingRules that prevent removing the wrong record
- do not call it safe delete
- do not set canRemove true unless it is acceptable for MCP to perform it after confirmation

If archive/soft remove is supported:
- prefer archive or soft_remove
- explain exactly what field marks archival/removal
- define hard_remove as high risk unless clearly safe

6. Reorder operations
If reorder is supported or can be safely inferred:
- require human confirmation unless the plugin clearly exposes reorder behavior
- require dryRunRequired true
- require the new order to contain exactly the same records as the current order
- do not allow reorder to add, remove, or mutate records
- preserve record objects exactly
- define matching rules clearly

7. Bulk operations
Bulk operations are dangerous.

If bulk update/remove is not explicitly safe:
- require human confirmation
- require dryRunRequired true
- include safety rule limiting scope
- recommend dry-run preview before execution
- require each item to match exactly one current record
- do not allow hidden remove behavior inside bulk update

8. AI safety rules
Include strict rules such as:
- Never invent schema fields.
- Never update readOnlyFields.
- Never update identityFields unless explicitly confirmed.
- Never remove records unless removeMode allows it.
- Validate required fields before create.
- Preserve fields not included in update request.
- Prefer partial updates only for safeToUpdateFields.
- Ask for confirmation before destructive, remove, identity-changing, reorder, or bulk operations.
- If schema confidence is low, do not perform write operations without human confirmation.
- Do not change plugin configuration unless the operation is explicitly about configuration.
- Never overwrite a full shared datastore object with a partial object.
- Preserve unknown fields unless explicitly instructed otherwise.
- For read_merge_save stores, always read the full current object before writing.
- Detect changes between preview and final write when dryRunRequired is true.

9. Human confirmation
humanConfirmationRequiredFor should include:
- remove
- hard_remove
- archive if destructive
- reorder unless explicitly safe
- bulk_update
- bulk_remove
- schema_change
- changing identity fields
- changing read-only/system-managed fields
- any operation with low confidence
- any operation with availability "allowed_with_confirmation"

10. Unsupported operations
List any operations the plugin data model does not support safely.

Example:
{
  "operation": "hard_remove",
  "reason": "No safe hard remove behavior was detected in the plugin code."
}

11. Examples
Include examples that MCP can use:
- safeCreate
- safeUpdate
- safeRemove if supported
- unsafeRequests

Examples must match the real schema.

12. Confidence
Set overall confidence:
- high: schema and operations are clearly visible in code
- medium: most schema is visible but some behavior is inferred
- low: data model is unclear

If confidence is low:
- .buildfire/plugin.mcp.json must warn MCP not to perform write operations without human confirmation.

13. Keep plugin.mcp.json compact
Do not duplicate plugin.plan.json.
Do not include UI details unless they affect data safety.
Do not include file-level explanations.
Do not include sourceFiles.
Do not include long architecture summaries.

============================================================
VALIDATION REQUIREMENTS
============================================================

Before finishing:

1. Validate all three files are valid JSON.
2. Ensure there are no comments in JSON.
3. Ensure no trailing commas.
4. Ensure all paths are relative paths.
5. Ensure .buildfire/plugin.index.json references .buildfire/plugin.mcp.json.
6. Ensure .buildfire/plugin.plan.json references .buildfire/plugin.mcp.json in mcpSummary.
7. Ensure .buildfire/plugin.mcp.json only includes data-operation context, not full architecture.
8. Ensure .buildfire/plugin.mcp.json does not include sourceFiles.
9. Ensure .buildfire/plugin.mcp.json uses "remove" terminology instead of "delete" terminology unless the plugin truly has a safe delete model.
10. Ensure .buildfire/plugin.mcp.json includes toolSummary.
11. Ensure .buildfire/plugin.mcp.json includes writeStrategy and conflictHandling for every dataStore.
12. Ensure every .buildfire/plugin.mcp.json operation includes availability, dryRunRequired, matchingRules, and resultShape.
13. Ensure .buildfire/plugin.plan.json is deep enough for future code maintenance.
14. Ensure .buildfire/plugin.index.json is compact enough for quick lookup.
15. Ensure all datastore keys and schemas are based on real code evidence.
16. If uncertain, mark confidence low/medium and add notes.
17. Do not modify any existing plugin source files.

Final output:
- Write .buildfire/plugin.plan.json
- Write .buildfire/plugin.index.json
- Write .buildfire/plugin.mcp.json

Do NOT:
- Create any other files.
- Modify any existing source files.
- Output explanations outside the JSON files.
