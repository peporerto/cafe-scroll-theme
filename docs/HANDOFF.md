# Traspaso: tema Shopify "cafe-scroll-theme" (marca de trabajo: Altura)

Actualizado: 2026-11-19. Para abrir una conversación nueva sin perder contexto. Lee esto primero.

## 1. Objetivo y lógica de negocio

- Vender UN tema Shopify 2.0 para marcas de café de un solo producto, con scroll cinematográfico, grano que gira, simulador de tueste, SEO/GEO fuerte, accesible y seguro.
- Meta de precio de Santiago: **US$300 a US$400**.
- Lógica original: plantilla barata de vitrina; el ingreso real son los servicios (instalación y personalización).
- Regla de parada: 60 días sin ventas tras lanzar en Etsy = no hay v2.
- Preferencias de Santiago: español casual, directo; sin relleno ni opciones sueltas; no quiere UI genérica ni "de IA"; un solo producto completo.

### Hallazgo de mercado (honesto, investigación parcial)

- Etsy: los dos temas Shopify que pude leer cuestan **US$43,77** y **US$45,26** (este último con 50% de descuento sobre US$90,52). El segundo incluye 3 presets, guía PDF de 43 páginas, licencia para 1 tienda, soporte por mensaje y plantillas de wishlist, guía de tallas, comparar, contraseña, blog y FAQ. Sin servicio de instalación.
- Shopify Theme Store y temas premium de terceros: **US$180 a US$350** (District 220, Be Yours 280, Broadcast 300, Prestige/Symmetry/Focal 320, Empire 340, Impulse/Impact 350). Lo justifican: carrito deslizable, quick-buy, búsqueda predictiva, filtros, productos recomendados, reseñas, mega menú, soporte y mantenimiento.
- Conclusión: **US$300 a 400 por el tema solo, en Etsy, no es el precio típico** (Etsy está en US$40 a 90). Para llegar ahí hay que (a) igualar el alcance de un tema premium completo y (b) venderlo con paquete de instalación y personalización, o venderlo en un canal propio. Estrategia sugerida a decidir: tema solo US$59 a 99 en Etsy como gancho, y paquete "tema + instalación + personalización" US$300 a 400.
- Falta investigar: muestra de ~20 anuncios de Etsy con número de ventas y reseñas, qué imágenes usan en el anuncio, precios de ThemeForest (no se pudo leer), y si existe demanda real de temas de café con animación.

## 2. Estado actual del código

- Repo: https://github.com/peporerto/cafe-scroll-theme, rama de trabajo `claude/m5-setup` (último commit `cc2cbf6`). Nunca se empuja a `main`; Santiago hace el merge.
- Santiago en local (Windows, PowerShell): como los archivos compilados de `theme/assets` están dentro de git, `git pull` falla después de un build. Usar:
  ```
  git fetch
  git checkout claude/m5-setup
  git reset --hard origin/claude/m5-setup
  git clean -fd theme/assets
  npm install
  npm run build
  npm run preview     (http://localhost:3000, Ctrl+F5)
  ```
- Pendiente de decidir: sacar `theme/assets/main.js` y `chunk-*.js` de git (los genera `npm run build`).
- Stack: tema Liquid escrito desde cero (NO Skeleton ni Dawn, por licencia), esbuild (`src/main.js` a `theme/assets/main.js` + chunks), GSAP + ScrollTrigger, Lenis, Three.js (import dinámico solo cerca del simulador), CSS plano.
- Previsualización sin Shopify: `scripts/_render.mjs` + `scripts/preview.mjs` (liquidjs con imágenes de `preview-images/`).
- Harness de pruebas con Playwright: estaba en `/home/claude/harness` (FUERA del repo, se puede perder). Hay que moverlo a `scripts/qa/`.

### Estado por sección de la home

| Sección | Estado | Notas |
|---|---|---|
| Hero | Bien | Bolsa cerrada, se abre, interior con granos, un grano salta y aterriza en fondo claro. Etapa "macro" eliminada por fea. Pin de 380% |
| Historia | Funciona | La menos trabajada visualmente |
| Anatomía | Bien | Grano gira (72 cuadros WebP por scroll), se abre en corte, 4 datos aparecen uno a uno con líneas; móvil una tarjeta a la vez |
| Simulador de tueste | **Débil** | Usa grano 3D procedural que a tamaño grande se ve grumoso; no combina con las fotos reales |
| Catálogo | Bien | Pared con 4 nichos; la luz se enciende con hover (escritorio) o al deslizar (móvil); sin foto dibuja una pared CSS |
| Header / footer | Mínimos | Solo marca y menú; el footer está desactivado en la home; no hay carrito |

Páginas existentes: SOLO `templates/index.json`. Es una landing de alto impacto, no una tienda.

### Peso medido (build actual)

- `main.js` 6 KB gz; módulos compartidos ~46 KB gz; chunk de Three.js 142 KB gz (carga bajo demanda).
- 72 cuadros del grano: 1,4 MB; `bean-cut.webp` 66 KB.
- Imágenes de demo: 0,2 a 0,9 MB cada una.
- Estimado de la home recorrida completa: 3,5 a 4 MB (meta: 3 MB móvil).
- Lighthouse móvil real: NO medido. Rendimiento en teléfono real: NO probado.
- No se necesita S3: la CDN de Shopify sirve assets e imágenes (con WebP/AVIF por `image_url`). S3 solo tendría sentido en una web fuera de Shopify.

## 3. Qué falta para poder cobrar US$300 a 400

Referencia: requisitos del Shopify Theme Store (https://shopify.dev/docs/storefronts/themes/store/requirements). No vamos a enviarlo al Theme Store, pero es la vara de un tema "de pago serio".

### A. Plantillas obligatorias que faltan (hoy solo existe `index.json`)

`product.json` (la más crítica: precio, variantes tamaño/molienda/tueste, agregar al carrito, galería), `cart.json`, `collection.json`, `list-collections.json`, `page.json`, `page.contact.json`, `blog.json`, `article.json`, `search.json`, `404.json`, `password.json`, `gift_card.liquid`, `settings_data.json`. Todas con soporte de secciones. Sección "Custom Liquid". Header y footer como section groups.

### B. Funciones de tienda que justifican el precio

- Carrito deslizable con cantidades, notas, descuentos, botones de pago acelerado, mensaje de carrito vacío.
- Búsqueda predictiva y filtros en colección/búsqueda.
- Selector de variantes y soporte de planes de suscripción (selling plans) — clave para café.
- Banner de anuncio, ícono de carrito en header, footer real con newsletter y íconos de pago a color.
- Bloque de preguntas frecuentes (también sirve para GEO), reseñas (espacio para app), productos recomendados.
- Específico de café: ficha de notas de cata, guía de preparación, mapa de origen, selector de molienda.
- Ajustes del personalizador: favicon, logo (horizontal y vertical), `font_picker`, mínimo 4 colores con pares fondo/texto, nivel de movimiento (`motion_level`).
- Tema con 2 a 3 presets (más valor percibido), cada uno con demo.

### C. Rendimiento, accesibilidad y SEO (M5)

- Theme Store exige Lighthouse promedio mínimo 60 rendimiento y 90 accesibilidad (home, colección, producto). Meta propia: móvil 90+, LCP 2,5 s, INP 200 ms, CLS 0,1.
- Bajar peso: cuadros del grano de 72 a ~48 o 400 px en móvil; AVIF/WebP con `image_url`; precargar solo la primera imagen del hero.
- Accesibilidad: contraste 4,5:1 (texto) y 3:1 (grande), objetivos táctiles 24×24 px, foco visible, teclado completo, `prefers-reduced-motion`, alt en imágenes.
- SEO/GEO: JSON-LD (Organization, Product en la página de producto, FAQPage, BreadcrumbList), un solo H1, `robots.txt.liquid` que permita rastreadores de IA, tabla HTML de etapas de tueste, texto siempre presente en el HTML.
- Compatibilidad: Safari/Chrome/Firefox/Edge recientes, Samsung Internet, y que comprar funcione en los navegadores internos de Instagram, Facebook y Pinterest (RIESGO: pin + Lenis en webviews, no probado).
- Seguridad: `npm audit` (hoy 0 vulnerabilidades), sin secretos, sin `eval`, Theme Check limpio.

### D. Producto, soporte y venta

- Guía PDF (la competencia entrega ~43 páginas), video de demostración, demo en vivo en una tienda de desarrollo, changelog, política de soporte (tiempo de respuesta), licencia de uso por 1 tienda, política de reembolso.
- Anuncio de Etsy: imágenes del tema funcionando (capturas reales), GIFs/video del scroll, lista clara de qué incluye y qué no.
- Servicio: paquete de instalación y personalización con precio y alcance definidos.

### E. Mejoras de calidad pendientes

- Rehacer el simulador con imágenes reales del grano (o modelo GLB pulido) en vez del grano procedural.
- Subir las fotos a ~2400 px (hoy 1376 a 1679 px).
- Historia, header y footer a nivel de diseño del resto.
- Probar en teléfono real (rendimiento y Lenis).

## 4. Qué NO se entrega y debe suministrar el cliente

Hoy todas las imágenes y el video de la demo se generaron con Gemini y Veo y **no hay licencia comercial confirmada**. No se pueden meter en el ZIP de venta.

**Solo se entrega:** código del tema, estructura de secciones, estilos, animaciones, marcadores de posición neutros (CSS/SVG, la pared de nichos en CSS) e instrucciones.

**El cliente debe suministrar:**
- Marca: nombre, logo, favicon, paleta, tipografía (por `font_picker`).
- Fotos de su producto y sus bolsas (con derechos de uso).
- Foto de hero/plantación (propia o con licencia).
- Secuencia del grano girando: video propio del grano (el tema recibe los cuadros; se debe entregar un script y una guía para convertirlo, hoy no está en el repo) y el recorte en corte.
- Foto de pared con 4 nichos (opcional; hay versión CSS).
- Textos: historia, notas de cata, preguntas frecuentes, políticas legales (privacidad, términos, envíos, reembolsos).
- Datos de producto, precios, variantes, reseñas, dominio, pasarela de pago, impuestos y envíos.
- Cuenta de Shopify en un plan que permita publicar temas.

**Debe quedar escrito en el anuncio y en la guía:** las fotos del anuncio son de demostración; no se transfieren; el comprador necesita sus propias imágenes.

## 5. Licencias y reglas

- Skeleton y Dawn: no se usan (la licencia de Skeleton limita la venta al Theme Store). Ver `LICENSE-NOTES.md`.
- three y lenis: MIT.
- **GSAP:** su licencia estándar "no charge" permite uso comercial, pero **no dice explícitamente nada sobre empaquetarlo dentro de un tema que se vende a terceros**, y prohíbe usarlo en herramientas que permitan crear animaciones visuales sin código que compitan con Webflow, ni quitar avisos de propiedad. Acción: escribir al soporte de GSAP/Webflow para confirmar por escrito el caso "tema de Shopify vendido a terceros con ajustes de movimiento en el editor". **La sección de GSAP en `LICENSE-NOTES.md` está desactualizada** (menciona la licencia "Business Green" y una condición de suscripción que ya no es la actual); reescribirla.
- **Gemini/Veo:** Google marca todo el contenido con SynthID (invisible, no debe eliminarse). No encontré un texto oficial de Google que confirme uso comercial y redistribución para cada plan; los términos dependen del plan y del producto. Acción: leer los términos de Google para el plan de Santiago y guardar la confirmación; si no existe, no entregar esas imágenes.
- **Etsy (política del 22-oct-2026):** obligatorio declarar el uso de IA; ban categórico a guías funcionales (patrones, recetas, instrucciones) hechas con IA; cada anuncio necesita al menos una foto sin editar del artículo real. Una captura real del tema funcionando cumple. Las imágenes de demo generadas con IA son aceptables como complemento si representan fielmente lo que recibe el comprador, y deben declararse. Etsy ampliará la detección a anuncios existentes.
- **Sitio de referencia (Flor de Arauca):** solo se replicó la idea de interacción. Ninguna imagen, texto, logo ni marca suya debe estar en el repo o en el ZIP. La carpeta `design-reference/` (capturas de referencia) y `docs/` NO deben ir en el ZIP de venta; `preview-images/` tampoco.
- Marca "Altura" es provisional; verificar que no choque con una marca registrada de café antes de lanzar.

## 6. Lecciones técnicas (para no repetir errores)

- Fijar con pin el elemento `section` mismo (`trigger: section, pin: true, end: '+=N%'`, `scrub: 1.2`, `anticipatePin`, `invalidateOnRefresh`), nunca un contenedor alto interno.
- No animar la misma propiedad del mismo elemento desde dos tweens.
- Estados ocultos iniciales solo bajo `html.js-motion[data-motion-effective="full"]`; el texto siempre está en el HTML.
- No usar el atajo `inset: auto` después de `left/top`: anula las posiciones.
- Pantalla de Three.js: un único renderer compartido (`src/stage.js`) con `activate(owner)`; los colores de vértice deben ser blancos y el color real va en `material.color`.
- Cuadros del grano: recorte por saturación (la sombra es gris neutra, el grano saturado).
- Pruebas: hay que recorrer toda la página antes de medir, porque los `pin-spacer` se crean tarde. Chromium con SwiftShader: `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`.
- Los hooks de "commits sin subir" a veces fallan por la referencia local desactualizada: comparar `git ls-remote origin <rama>` con `git rev-parse HEAD`.

## 7. Decisiones abiertas

1. ¿Landing de impacto o tienda completa? Recomendación: tienda completa mínima (producto, carrito, colección, footer) o no se puede defender US$300 a 400.
2. Estrategia de precio: gancho barato en Etsy + paquete con servicio, o canal propio.
3. Nombre final de la marca y idioma del anuncio (inglés con versión en español).
4. Cómo resolver las imágenes de demo: fotos propias de Santiago (la opción más limpia), stock con licencia comercial clara, o IA con confirmación escrita.
5. Simulador: imágenes reales vs modelo 3D pulido.
6. Sacar los archivos compilados de git.

## 8. Orden de trabajo propuesto para la nueva conversación

1. Cerrar la investigación de mercado (muestra de anuncios de Etsy y ThemeForest) y fijar el precio y el alcance.
2. Resolver licencias: GSAP por escrito, términos de Gemini/Veo, fotos propias.
3. Páginas de tienda: producto, carrito, colección, footer, header con carrito, resto de plantillas obligatorias.
4. Simulador con imágenes reales.
5. M5: SEO/JSON-LD, robots, rendimiento, accesibilidad, Theme Check, pruebas en teléfono real y webviews.
6. Empaque: ZIP limpio sin imágenes con licencia dudosa, guía PDF, video, demo, anuncio de Etsy.
