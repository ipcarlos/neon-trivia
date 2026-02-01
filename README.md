# 🎮 Neon Trivia


![Neon Trivia](https://img.shields.io/badge/Neon-Trivia-ff00ff?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

<div align="center" style="display:grid;">
Un juego de trivia interactivo con una estética neon vibrante y futurista, potenciado por IA.

[Reportar Bug](https://github.com/ipcarlos/neon-trivia/issues) · [Solicitar Feature](https://github.com/ipcarlos/neon-trivia/issues)

</div>

---

## 📋 Tabla de Contenidos

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Contribuir](#-contribuir)
- [Licencia](#-licencia)
- [Contacto](#-contacto)

---

## 🎯 Acerca del Proyecto

**Neon Trivia** es una aplicación de trivia moderna y visualmente impactante que combina una interfaz de usuario con efectos neon con preguntas generadas por IA utilizando la API de Gemini. La aplicación ofrece una experiencia de juego inmersiva con diseño responsivo y efectos visuales llamativos.

### ¿Por qué Neon Trivia?

- **🎨 Diseño Único**: Interfaz neon futurista que hace que cada pregunta sea visualmente atractiva
- **🤖 IA Integrada**: Preguntas generadas dinámicamente usando Google Gemini API
- **⚡ Rendimiento**: Construido con Vite para tiempos de carga ultrarrápidos
- **📱 Responsivo**: Funciona perfectamente en desktop, tablet y móvil
- **🎮 Experiencia Inmersiva**: Efectos visuales y animaciones fluidas

---

## ✨ Características

- ✅ **Generación de preguntas con IA** mediante Gemini API
- ✅ **Interfaz neon vibrante** con efectos de brillo y animaciones
- ✅ **Sistema de puntuación** en tiempo real
- ✅ **Diseño responsivo** adaptable a cualquier dispositivo
- ✅ **Múltiples categorías** de preguntas
- ✅ **Feedback visual** para respuestas correctas e incorrectas
- ✅ **TypeScript** para mayor seguridad de tipos
- ✅ **Componentes modulares** para fácil mantenimiento

---

## 🛠️ Tecnologías

Este proyecto está construido con las siguientes tecnologías:

### Core
- **[React](https://reactjs.org/)** - Biblioteca de JavaScript para construir interfaces de usuario
- **[TypeScript](https://www.typescriptlang.org/)** - Superset tipado de JavaScript
- **[Vite](https://vitejs.dev/)** - Build tool y dev server de nueva generación

### APIs
- **[Google Gemini API](https://ai.google.dev/)** - API de IA para generación de preguntas

### Styling
- **CSS3** - Efectos neon y animaciones personalizadas
- **CSS Modules** / **Styled Components** (según implementación)

---

## 📦 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v16.0.0 o superior)
- **npm** (v8.0.0 o superior) o **yarn**
- **Gemini API Key** - Obtén una en [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## 🚀 Instalación

Sigue estos pasos para configurar el proyecto localmente:

1. **Clona el repositorio**
   ```bash
   git clone https://github.com/ipcarlos/neon-trivia.git
   cd neon-trivia
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Configura las variables de entorno**
   ```bash
   # Crea un archivo .env.local en la raíz del proyecto
   touch .env.local
   ```

4. **Añade tu API key**
   ```env
   GEMINI_API_KEY=tu_api_key_aqui
   ```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# Opcional: Configuración adicional
VITE_APP_TITLE=Neon Trivia
VITE_API_TIMEOUT=10000
```

### Obtener API Key de Gemini

1. Visita [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Crea un nuevo proyecto o selecciona uno existente
4. Genera una nueva API key
5. Copia la key y pégala en tu archivo `.env.local`

---

## 💻 Uso

### Modo Desarrollo

Ejecuta la aplicación en modo desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Build para Producción

Compila la aplicación para producción:

```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

### Preview de Build

Previsualiza la build de producción:

```bash
npm run preview
```

### Linting

Ejecuta el linter para verificar el código:

```bash
npm run lint
```

---

## 🤝 Contribuir

Las contribuciones son lo que hace que la comunidad open source sea un lugar increíble para aprender, inspirar y crear. Cualquier contribución que hagas será **muy apreciada**.

### Cómo Contribuir

1. **Fork** el proyecto
2. Crea tu **Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. **Push** a la Branch (`git push origin feature/AmazingFeature`)
5. Abre un **Pull Request**

### Guías de Contribución

- Sigue las convenciones de código del proyecto
- Escribe tests para nuevas funcionalidades
- Actualiza la documentación según sea necesario
- Mantén los commits descriptivos y atómicos
---

<div align="center">

### ⭐ Si te gusta este proyecto, ¡dale una estrella!

Hecho con 💜 y mucho ☕

</div>