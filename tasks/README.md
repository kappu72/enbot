# Tasks Directory

This directory contains Product Requirements Documents (PRDs) and task lists for implementing features from the main FEATURES.md roadmap.

## Workflow

### 1. Feature Selection
Choose a feature from `/FEATURES.md` that you want to implement.

### 2. Create PRD
Use the `create-prd.mdc` rule to generate a detailed Product Requirements Document:
```
Create PRD for [feature name]
```

### 3. Generate Tasks
Use the `generate-tasks.mdc` rule to create actionable tasks from the PRD:
```
Generate tasks from prd-[feature-name].md
```

### 4. Implement
Follow the `process-task-list.mdc` rule to implement tasks one by one with proper testing and commits.

## File Naming Convention

- **PRDs**: `prd-[feature-name].md`
- **Task Lists**: `tasks-prd-[feature-name].md`

## Example Files

- `prd-fix-quota-message-copy.md` - Example PRD for fixing escaped characters
- `tasks-prd-fix-quota-message-copy.md` - Example task list (to be generated)

## Quality Standards

Each PRD should include:
- Clear problem statement and goals
- User stories with acceptance criteria
- Technical requirements and considerations
- Success metrics and definition of done

Each task list should include:
- Relevant files to be created/modified
- Parent tasks broken down into actionable sub-tasks
- Clear implementation steps

## Integration with Cursor Rules

This system integrates with the following Cursor rules:
- `feature-requirements.mdc` - Overall requirements system
- `create-prd.mdc` - PRD creation
- `generate-tasks.mdc` - Task list generation
- `process-task-list.mdc` - Implementation workflow
- `create-db-functions.mdc` - Database function creation
- `create-migration.mdc` - Database migrations
- `create-rls-policies.mdc` - Security policies

## Getting Started

1. Select a feature from FEATURES.md
2. Run: "Create PRD for [feature name]"
3. Answer the clarifying questions
4. Review the generated PRD
5. Run: "Generate tasks from prd-[feature-name].md"
6. Execute tasks following the process-task-list workflow
