# Git Worktrees — Sesiones Paralelas

## Qué es
En vez de 1 sesión de Claude secuencial, corrés 3-5 simultáneos en directorios separados. Cada uno trabaja en su branch sin conflictos.

## Setup rápido

### Crear worktree para una feature
```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes"

# Crear worktree para feature A
git worktree add ../reservasai-feature-a -b feature/nombre-a

# Crear worktree para feature B
git worktree add ../reservasai-feature-b -b feature/nombre-b

# Crear worktree para bug fix
git worktree add ../reservasai-bugfix -b fix/nombre-bug
```

### Abrir Claude en cada worktree
```bash
# Terminal 1
cd "C:/Users/Ulise/Desktop/z/reservasai-feature-a" && claude

# Terminal 2
cd "C:/Users/Ulise/Desktop/z/reservasai-feature-b" && claude

# Terminal 3
cd "C:/Users/Ulise/Desktop/z/reservasai-bugfix" && claude
```

### Cuando terminás, mergear
```bash
cd "C:/Users/Ulise/Desktop/z/saas para reserva de clientes"

# Mergear feature A
git merge feature/nombre-a

# Mergear feature B
git merge feature/nombre-b

# Limpiar worktrees
git worktree remove ../reservasai-feature-a
git worktree remove ../reservasai-feature-b
git worktree remove ../reservasai-bugfix
```

## Ejemplo: 3 tareas en paralelo

```bash
# Worktree 1: Widget embebible
git worktree add ../reservasai-widget -b feature/embeddable-widget

# Worktree 2: Calendario visual
git worktree add ../reservasai-calendar -b feature/visual-calendar

# Worktree 3: Reviews post-visita
git worktree add ../reservasai-reviews -b feature/post-visit-reviews
```

Abrís 3 terminales, lanzás `claude` en cada una, y las 3 trabajan en paralelo.

## Reglas
- Cada worktree tiene su propio branch
- No tocar los mismos archivos en 2 worktrees (si es inevitable, mergear uno primero)
- CLAUDE.md y LESSONS.md se comparten automáticamente (están en main)
- Al mergear, resolver conflictos si los hay
- Limpiar worktrees cuando ya no se necesitan

## Listar worktrees activos
```bash
git worktree list
```
