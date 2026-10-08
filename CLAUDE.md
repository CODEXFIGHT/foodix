# Instrucciones para Claude Code

Antes de modificar código, usa CodeGraph como primera fuente de contexto.

Reglas:
- No explores el proyecto completo con grep, glob o lectura masiva de archivos.
- Usa CodeGraph para ubicar símbolos, dependencias, imports, relaciones y entry points.
- Lee únicamente los archivos estrictamente necesarios para la tarea.
- Antes de editar, resume qué módulos vas a tocar y por qué.
- Mantén los cambios acotados.
- No abras archivos grandes completos si solo necesitas funciones específicas.
- Si necesitas entender impacto, usa CodeGraph para revisar callers/callees antes de modificar.
- Si el proyecto es frontend, identifica rutas, componentes, stores, hooks y servicios relacionados.
- Si el proyecto es backend, identifica controllers, services, models, middlewares, routes y tests relacionados.
