# 🐾 VetCare API

API REST backend de **VetCare**, una plataforma Full Stack para la gestión de una clínica veterinaria.

La API está desarrollada con **NestJS, TypeScript, Prisma y PostgreSQL** e incluye autenticación, autorización basada en roles, gestión de usuarios y mascotas, reserva de turnos e historias clínicas.

El proyecto busca aplicar conceptos de backend utilizados en aplicaciones reales, incluyendo seguridad, validaciones, control de concurrencia, transacciones y separación de responsabilidades.

---

# 🚀 Tecnologías

* Node.js
* NestJS
* TypeScript
* PostgreSQL
* Prisma ORM
* Supabase
* JWT
* bcrypt
* class-validator
* Swagger / OpenAPI

---

# 🏗️ Arquitectura

VetCare utiliza una arquitectura con frontend y backend separados.

```text
Navegador
    │
    ▼
Next.js Frontend / BFF
    │
    │ Authorization: Bearer JWT
    ▼
NestJS REST API
    │
    ▼
Prisma ORM
    │
    ▼
PostgreSQL
```

El frontend y el backend se mantienen como aplicaciones independientes.

La aplicación Next.js funciona además como **Backend for Frontend (BFF)**.

El token de autenticación se almacena del lado del frontend mediante una cookie segura `httpOnly`. El BFF obtiene ese token y lo envía a la API NestJS mediante:

```text
Authorization: Bearer <JWT>
```

De esta manera, el navegador no necesita almacenar el JWT en `localStorage`.

---

# 📁 Estructura del proyecto

```text
src/
├── auth/
│   ├── decorators/
│   ├── guards/
│   ├── interfaces/
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
│
├── users/
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
│
├── pets/
│   ├── dto/
│   ├── pets.controller.ts
│   ├── pets.module.ts
│   └── pets.service.ts
│
├── appointments/
│   ├── dto/
│   ├── appointments.controller.ts
│   ├── appointments.module.ts
│   └── appointments.service.ts
│
├── clinical-records/
│   ├── dto/
│   ├── clinical-records.controller.ts
│   ├── clinical-records.module.ts
│   └── clinical-records.service.ts
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── generated/
├── app.module.ts
└── main.ts

prisma/
├── migrations/
└── schema.prisma
```

La aplicación se organiza por **dominios funcionales**, manteniendo controllers, services y DTOs agrupados según la funcionalidad a la que pertenecen.

---

# 🔐 Autenticación

VetCare utiliza autenticación mediante **JSON Web Tokens (JWT)**.

Cuando un usuario inicia sesión correctamente, la API genera un access token.

El payload contiene información como:

```json
{
  "sub": 1,
  "email": "usuario@vetcare.com",
  "role": "USER"
}
```

Donde:

```text
sub
→ identificador del usuario

email
→ email del usuario

role
→ rol del usuario
```

Los endpoints protegidos esperan recibir:

```text
Authorization: Bearer <JWT>
```

Las contraseñas nunca se almacenan en texto plano.

Antes de persistirse en PostgreSQL son procesadas mediante **bcrypt**.

---

# 👥 Roles y autorización

VetCare actualmente posee dos roles:

```text
USER
ADMIN
```

La autorización se implementa utilizando Guards y decorators de NestJS.

Por ejemplo:

```ts
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
```

## USER

Un usuario normal puede:

* Gestionar sus propias mascotas.
* Consultar sus turnos.
* Reservar turnos.
* Reprogramar sus turnos.
* Cancelar turnos.
* Consultar la historia clínica de sus propias mascotas.

## ADMIN

Un administrador puede:

* Consultar los usuarios registrados.
* Editar usuarios.
* Modificar roles.
* Gestionar estados de turnos.
* Consultar historias clínicas de cualquier mascota.
* Crear registros clínicos.
* Editar registros clínicos.

La autorización siempre se valida en el backend.

Ocultar funcionalidades en el frontend es únicamente una mejora de experiencia de usuario y **no constituye una medida de seguridad**.

---

# 🐶 Gestión de mascotas

Cada usuario puede registrar y gestionar sus propias mascotas.

La relación principal es:

```text
User
 │
 ├── Pet
 ├── Pet
 └── Pet
```

El backend valida la propiedad del recurso.

Esto evita que un usuario pueda acceder a una mascota perteneciente a otro usuario simplemente modificando el ID de una request.

Por ejemplo:

```text
GET /pets/10
```

no devolverá la mascota si el usuario autenticado no es su propietario.

La eliminación de mascotas también respeta la integridad referencial de PostgreSQL.

Si una mascota posee turnos asociados, su eliminación puede ser rechazada para preservar la información histórica.

---

# 📅 Sistema de turnos

VetCare posee un sistema de reserva basado en horarios predefinidos mediante `AppointmentSlot`.

Las reglas actuales son:

* Atención de lunes a viernes.
* Horario de 09:00 a 21:00.
* Turnos cada 30 minutos.
* Último turno disponible a las 20:30.
* No se permiten reservas en fechas pasadas.
* Un mismo horario no puede tener dos turnos activos.

Los estados posibles son:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

El flujo principal es:

```text
PENDING
   │
   │ ADMIN confirma
   ▼
CONFIRMED
   │
   │ ADMIN completa
   ▼
COMPLETED
```

Además:

```text
PENDING ─────────► CANCELLED

CONFIRMED ───────► CANCELLED
```

Los estados:

```text
PENDING
CONFIRMED
```

ocupan un horario.

Un turno:

```text
CANCELLED
```

libera el horario para permitir una nueva reserva.

---

# 🔒 Control de concurrencia

Uno de los objetivos del proyecto es evitar que dos usuarios puedan reservar simultáneamente el mismo turno.

Para resolver esta condición de carrera se utilizan:

* Transacciones de PostgreSQL.
* Bloqueo pesimista.
* `SELECT FOR UPDATE`.

Durante una reserva se bloquea la fila correspondiente de `AppointmentSlot`.

Ejemplo simplificado:

```sql
SELECT id, "startTime"
FROM "AppointmentSlot"
WHERE id = ?
FOR UPDATE;
```

Esto genera un flujo similar al siguiente:

```text
Usuario A                    Usuario B
    │                            │
    ▼                            ▼
Reserva slot 25             Reserva slot 25
    │                            │
    ▼                            ▼
BEGIN                       BEGIN
    │                            │
    ▼                            ▼
SELECT FOR UPDATE           espera...
    │
    ▼
Verifica disponibilidad
    │
    ▼
Crea turno
    │
    ▼
COMMIT
                                 │
                                 ▼
                           se libera el lock
                                 │
                                 ▼
                           vuelve a verificar
                                 │
                                 ▼
                           409 Conflict
```

Esto evita condiciones de carrera incluso cuando múltiples usuarios intentan reservar exactamente el mismo horario.

También permite que la aplicación pueda escalar a múltiples instancias del backend manteniendo el control de concurrencia en la base de datos.

---

# 🩺 Historias clínicas

VetCare permite almacenar la historia clínica de cada mascota.

Una mascota puede tener múltiples registros clínicos.

```text
Pet
 │
 ├── ClinicalRecord
 ├── ClinicalRecord
 └── ClinicalRecord
```

Cada registro puede contener:

* Fecha de consulta.
* Motivo.
* Diagnóstico.
* Tratamiento.
* Observaciones.
* Peso.

Los permisos son:

```text
USER
→ puede consultar la historia clínica de sus mascotas.

ADMIN
→ puede consultar cualquier historia clínica.
→ puede crear registros clínicos.
→ puede editar registros clínicos.
```

Los usuarios normales no pueden modificar información clínica.

La autorización se controla en el backend mediante JWT, roles y validación de ownership.

---

# 🗄️ Base de datos

VetCare utiliza **PostgreSQL** como base de datos relacional.

El acceso a datos se realiza mediante **Prisma ORM**.

El esquema se encuentra definido en:

```text
prisma/schema.prisma
```

Los cambios estructurales de la base se administran mediante migraciones.

Durante desarrollo:

```bash
npx prisma migrate dev --name nombre_migracion
```

Después de cambios en el schema puede regenerarse Prisma Client mediante:

```bash
npx prisma generate
```

Para producción:

```bash
npm run prisma:deploy
```

Actualmente PostgreSQL se encuentra alojado mediante **Supabase**.

---

# ⚙️ Variables de entorno

Crear un archivo:

```text
.env
```

en la raíz del proyecto.

Ejemplo:

```env
DATABASE_URL=
JWT_SECRET=
PORT=3001
```

El repositorio puede contener:

```text
.env.example
```

pero nunca deben subirse credenciales reales, contraseñas, tokens ni secretos.

---

# 📦 Instalación

Clonar el repositorio:

```bash
git clone <url-del-repositorio>
```

Ingresar al proyecto:

```bash
cd vetcare-api
```

Instalar dependencias:

```bash
npm install
```

Crear las variables de entorno:

```bash
cp .env.example .env
```

Generar Prisma Client:

```bash
npx prisma generate
```

Ejecutar migraciones:

```bash
npx prisma migrate dev
```

Iniciar el servidor en modo desarrollo:

```bash
npm run start:dev
```

Por defecto la API se ejecuta en:

```text
http://localhost:3001
```

---

# 📚 Swagger

La API incluye documentación interactiva utilizando Swagger / OpenAPI.

Con el backend ejecutándose localmente:

```text
http://localhost:3001/api/docs
```

Desde Swagger es posible:

* Consultar endpoints.
* Visualizar DTOs.
* Revisar parámetros.
* Ejecutar requests.
* Probar endpoints autenticados.

Para endpoints protegidos se puede utilizar el botón:

```text
Authorize
```

e ingresar un JWT válido.

---

# 🔗 Endpoints principales

## Autenticación

```text
POST   /auth/login
GET    /auth/me
```

---

## Usuarios

```text
POST   /users
GET    /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
```

Las operaciones administrativas están protegidas mediante roles.

El registro de usuarios es público, pero un usuario no puede asignarse a sí mismo el rol `ADMIN`.

---

## Mascotas

```text
POST   /pets
GET    /pets
GET    /pets/:id
PATCH  /pets/:id
DELETE /pets/:id
```

Las operaciones validan que la mascota pertenezca al usuario autenticado.

---

## Turnos

```text
GET    /appointments
POST   /appointments
GET    /appointments/availability
GET    /appointments/:id
PATCH  /appointments/:id
PATCH  /appointments/:id/cancel
PATCH  /appointments/:id/confirm
PATCH  /appointments/:id/complete
```

La confirmación y finalización de turnos requieren rol:

```text
ADMIN
```

---

## Historias clínicas

```text
GET    /clinical-records/pet/:petId
GET    /clinical-records/:id
POST   /clinical-records
PATCH  /clinical-records/:id
```

La creación y modificación requieren rol `ADMIN`.

Los usuarios normales únicamente pueden consultar historias clínicas pertenecientes a sus propias mascotas.

---

# ✅ Validación de requests

La aplicación utiliza globalmente `ValidationPipe` de NestJS.

Configuración:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
```

Esto permite:

* Validar DTOs.
* Rechazar propiedades inesperadas.
* Transformar parámetros automáticamente.
* Mantener contratos claros entre cliente y servidor.

---

# 🌐 CORS

CORS se encuentra configurado para aceptar únicamente orígenes autorizados.

Durante desarrollo:

```text
http://localhost:3000
```

También puede configurarse el dominio de producción correspondiente al frontend de VetCare.

---

# 🛡️ Seguridad

VetCare implementa distintas prácticas de seguridad y consistencia.

Entre ellas:

* Hash de contraseñas con bcrypt.
* Autenticación mediante JWT.
* Autorización basada en roles.
* Guards de NestJS.
* Validación de ownership.
* DTOs con `class-validator`.
* Rechazo de propiedades inesperadas.
* Cookies `httpOnly` mediante el BFF del frontend.
* Validación de permisos independiente del frontend.
* Queries parametrizadas.
* Transacciones de base de datos.
* Bloqueo pesimista.
* Prevención de condiciones de carrera.
* Variables de entorno para secretos.

---

# 🏭 Build de producción

Generar el build:

```bash
npm run build
```

Ejecutar:

```bash
npm run start:prod
```

El proceso de build genera Prisma Client antes de compilar la aplicación NestJS.

---

# 🗺️ Próximas mejoras

El roadmap del proyecto incluye:

* Gestión de recetas veterinarias.
* Interfaz completa de historias clínicas.
* Dashboard administrativo.
* Tests unitarios.
* Tests de integración.
* Tests de concurrencia para turnos.
* Tests E2E.
* Mejoras de observabilidad y logging.
* Deploy del backend.
* CI/CD.

---

# 🎯 Objetivo del proyecto

VetCare API fue desarrollado como proyecto de portfolio con el objetivo de aplicar conceptos de backend utilizados en sistemas reales, y no únicamente operaciones CRUD básicas.

El proyecto permite demostrar conocimientos sobre:

* Diseño de APIs REST.
* Arquitectura modular con NestJS.
* TypeScript.
* Autenticación.
* JWT.
* Autorización.
* RBAC.
* Guards y decorators.
* Ownership de recursos.
* PostgreSQL.
* Modelado relacional.
* Prisma ORM.
* Migraciones.
* Transacciones.
* Control de concurrencia.
* Bloqueo pesimista.
* Prevención de race conditions.
* Validación mediante DTOs.
* Swagger / OpenAPI.
* Separación frontend/backend.
* Patrón Backend for Frontend.
* Buenas prácticas de seguridad.

---

# 👨‍💻 Autor

**Lautaro Ferreyra**

Full Stack Developer
