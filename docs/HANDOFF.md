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
| Anatomía | Bien (fusionada en el hero, 2026-11-19) | Ya no es sección aparte: es la misma escena pineada del hero. Bolsa cerrada → bolsa abierta con zoom → el grano salta → el fondo se aclara → ese mismo grano gira (72 cuadros WebP), se abre en corte y salen 4 datos uno a uno con líneas; móvil una tarjeta a la vez. Solo hay 2 fotos: bolsa cerrada y bolsa abierta de cerca (ajuste "Image 2" del Hero); la bolsa cerrada hace zoom hasta calzar con la abierta y esta aparece encima sin salto. El giro y el corte nunca se ven a la vez. Todo en `hero.liquid`, `hero-scene.js` y `base.css` |
| Simulador de tueste | **Débil** | Usa grano 3D procedural que a tamaño grande se ve grumoso; no combina con las fotos reales |
| Catálogo | Bien | Pared con 4 nichos; la luz se enciende con hover (escritorio) o al deslizar (móvil); sin foto dibuja una pared CSS |
| Header / footer | Mínimos | Solo marca y menú; el footer está desactivado en la home; no hay carrito |

Páginas existentes: `templates/index.json` (landing de impacto) y `templates/product.json` (página de producto, 2026-11-20) `templates/cart.json` (carrito) y `templates/collection.json` (colección, 2026-11-22). Faltan list-collections, page, blog, article, search, 404, password, gift_card.

### Peso medido (build actual)

- `main.js` 6 KB gz; módulos compartidos ~46 KB gz; chunk de Three.js 142 KB gz (carga bajo demanda).
- 72 cuadros del grano: 1,4 MB; `bean-cut.webp` 66 KB.
- Imágenes de demo: 0,2 a 0,9 MB cada una.
- Estimado de la home recorrida completa: 3,5 a 4 MB (meta: 3 MB móvil).
- Lighthouse móvil real: NO medido. Rendimiento en teléfono real: NO probado.
- No se necesita S3: la CDN de Shopify sirve assets e imágenes (con WebP/AVIF por `image_url`). S3 solo tendría sentido en una web fuera de Shopify.

## 3. Qué falta para poder cobrar US$300 a 400

Referencia: requisitos del Shopify Theme Store (https://shopify.dev/docs/storefronts/themes/store/requirements). No vamos a enviarlo al Theme Store, pero es la vara de un tema "de pago serio".

### A. Plantillas obligatorias que faltan (hoy existen `index.json`, `product.json`, `cart.json` y `collection.json`)

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

## 7. Decisiones abiertas (ver también la sección 9)

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

## 9. Anexo: investigación de Muse (19-nov-2026) cruzada con este proyecto

Documento: `Template_de__300_USD.html` (lo pasó Santiago). Muse asumió una página Next.js + Three.js para café, que Santiago querría ampliar a panadería y barbería. **Nuestro producto es un tema Shopify en Liquid** (ya hecho, con Three.js bajo demanda). Eso cambia varias conclusiones.

### Dónde coincide con mi investigación (confianza alta)
- Una sola página de un nicho NO se vende a US$300. Un template de café, panadería o barbería cuesta US$12 a 149 en todos los mercados vistos. Espresso (Webflow) a US$149 es el techo de un solo nicho; Caffeine X US$79; Brewie (Framer) US$99; Corvo (Framer, café que vende con Shopify) US$89.
- US$300 se paga por: paquete de varios nichos, tema Shopify completo (US$220 a 400 en el Theme Store), o sistema completo con documentos y soporte.
- Etsy atrae compradores de Canva de US$5 a 15; los temas Shopify que vi allí cuestan US$44 a 90.
- Theme Store: 15% de participación para Shopify sobre ventas brutas más 2,9% de procesamiento (verificado en shopify.dev).

### Dónde su análisis no aplica a nuestro caso
- "Reconstruir en Liquid sin Three.js": ya está hecho en Liquid con Three.js bajo demanda.
- Su expectativa #1, "editar sin código", ya la cumple el editor de temas de Shopify (secciones, bloques, ajustes). No hace falta `content.json` ni CMS externo.
- Su "Shopify es la ruta más difícil" vale para el Theme Store (aprobación, exclusividad según Muse, no verificada por mí). Vender el ZIP fuera del Theme Store no requiere aprobación: hay temas Shopify vendidos en Etsy. No verifiqué las reglas de Gumroad para temas Shopify.
- Reservas con Calendly/Cal.com, Stripe Payment Links, mapas, WhatsApp, LocalBusiness: son de web de negocio local (café con mesas, barbería con citas). Nuestro tema es una marca de café que vende bolsas en línea; el carrito y el pago ya los trae Shopify.

### Bifurcación que hay que decidir
- **A. Marca de producto que vende en línea (lo que se construyó):** hero con la bolsa, anatomía del grano, simulador, catálogo de nichos. Encaja con tostadores, té, chocolate, velas, cosmética de un solo producto.
- **B. Web de negocio local (café, panadería, barbería):** reservas, mapa, horario, menú, SEO local.
- Recomendación: A. La barbería no tiene producto ni bolsa; el motor de scroll no le sirve y exigiría un diseño nuevo. Un "paquete de 3" más realista son 3 presets de marcas de producto (por ejemplo café, té, chocolate) sobre el mismo motor. Decisión de Santiago.

### Qué sí tomar de Muse
- Meta de peso: home < 2 MB (ideal 1,5), mínimo < 3 MB. Nuestro estimado es 3,5 a 4 MB: hay que bajarlo más que la meta anterior.
- Lighthouse móvil ≥ 90 con puntajes publicados en el anuncio. Su medición: la mediana de 45 templates Three.js es 68 y solo 3 llegan a 90; el que cargaba Three.js al acercarse tuvo el mejor resultado (96), igual que nuestro diseño. Fuente secundaria (MotionLab), no verificada.
- Three.js: pausar fuera de pantalla, densidad de píxeles máx. 1,5 a 1,75, versión estática de respaldo sin WebGL.
- Guía escrita + video de 5 a 10 min; el comprador debe quedar en vivo en menos de 30 minutos; registro de cambios; soporte declarado (meta 6 meses de soporte y 12 de actualizaciones); licencia en niveles (1 tienda vs agencia); demo real sin Lorem Ipsum; un ZIP sin `node_modules`, claves ni errores de consola.
- Pruebas antes de publicar: sin JavaScript, sin WebGL, PageSpeed móvil y escritorio, teléfono real a 390×844 en 4G, prueba de edición con una persona que no programe (30 min), instalación limpia siguiendo solo los documentos, teclado y lector de pantalla.
- Los 10 errores que matan la venta: demo roto o lento, texto solo en el canvas, sin forma de editar, botón de compra que no lleva a ninguna parte, formulario que no envía, Lighthouse móvil < 60, documentos que no coinciden, sin soporte, licencia confusa, una página por US$300 cuando US$79 compra 12 a 40 páginas.

### Escalera de precio y canales (propuesta de Muse, a validar)
1. Gumroad + sitio demo propio: US$149 por nicho o US$299 el paquete de 3, sin aprobación; tú traes el tráfico. Comisión 10% + US$0,50 + 2,9% + US$0,30 en venta directa; 30% si la venta viene de Discover.
2. Framer Marketplace: 0% de comisión, techo observado US$200; implica reconstruir en Framer (no aplica a nuestro tema Liquid).
3. Webflow: realista US$129 a 149; reconstrucción completa.
4. Shopify Theme Store: techo de US$150 a 500, pero aprobación dura; proyecto de 6 a 12 meses.
5. ThemeForest: registro de autores nuevos en pausa (según Muse), comisión del 50%.
6. Etsy: Muse no lo recomienda para código; solo como embudo con un producto barato.
- Contradice parcialmente la idea original de vender en Etsy. Santiago decide el canal.

### Lo que Muse NO verificó (no tomarlo como hecho)
- Ranking de nichos (café > panadería > barbería): es inferencia de cantidad de anuncios, sin cifras de ventas.
- Comisión de Webflow (95% según el acuerdo de sep 2026; blogs dicen 80%).
- Que no existe un template de un solo nicho a US$300 en Framer o Webflow: es lo observado, no una regla.
- La columna de US$1.500 de su tabla quedó pendiente (falta el enlace del sistema).
- Muse no vio el código de nuestra página.

### Nuevo pendiente: demo público
- Una tienda de desarrollo de Shopify Partners tiene contraseña y no se le puede quitar: no sirve de demo público para compradores.
- Opción: demo estático generado con `scripts/_render.mjs` (el renderizador de Liquid ya existente) y alojado en S3 + CloudFront o Vercel. Aquí S3 sí tiene sentido (no para el tema, sino para el demo). Falta construirlo y ocultar las imágenes sin licencia en la versión pública, o usar fotos propias.



## 10. Página de producto (hecha 2026-11-20)

- Archivos: `theme/templates/product.json`, `theme/sections/main-product.liquid`, `theme/assets/product.css`, `src/product.js` (entrada propia, sale como `theme/assets/product.js`, funciona aunque el movimiento esté apagado), `theme/snippets/meta-tags.liquid` (Open Graph, ahora en el layout).
- Bloques del editor: título, precio, notas de cata, escala de tueste (1 a 5), selector de variantes, suscripción (selling plans), botones de compra (cantidad y pago acelerado), fila de confianza, descripción y filas plegables (hasta 6).
- Sin JS funciona igual: un select manda el id de variante y el formulario va a /cart/add. Con JS: píldoras por opción, agotados tachados, precio/URL/botón al cambiar, la foto de la variante se desplaza a la vista, barra de compra fija en móvil.
- (Reemplazado el 2026-11-23 por el diseño E, ver sección 13.) Antes: galería en columna con panel de estudio claro y ajuste "Blend photo backgrounds" (ya no existe).
- Datos estructurados: Product con `structured_data` (oficial de Shopify) y BreadcrumbList.
- Notas de cata: el campo del bloque se puede conectar a un metafield como fuente dinámica para que cambie por producto (sin conectar, todos los productos muestran el mismo texto).
- Las variantes ya no se tachan por combinación: solo se tacha un valor agotado en TODAS las combinaciones; una combinación agotada deshabilita el botón y muestra un aviso (2026-11-22).
- Vista previa local: `npm run preview` y abre `/products/ethiopia-yirgacheffe` (producto de prueba con 6 variantes, una agotada, y 2 planes de suscripción). Theme Check limpio.
- Agregar al carrito: por Ajax (`/cart/add.js`), sin recargar: aviso "Added to cart · View cart" y contador del header. Sin JS cae al formulario normal (/cart/add). Falta sección de productos recomendados y de reseñas.

## 11. Carrito (hecho 2026-11-20)

- Archivos: `theme/templates/cart.json`, `theme/sections/main-cart.liquid`, `theme/assets/cart.css`, `src/cart.js` (entrada propia) y `src/cart-api.js` (ayudas compartidas con producto: `addToCart`, `changeLine`, `updateNote`, `setCount`, `toast`). Ícono con contador en `theme/sections/header.liquid` (`[data-cart-count]`, se actualiza sin recargar).
- Funciona sin JS: cada línea es un campo `updates[]`; botón "Update cart" y "Check out" (`name=checkout`); un botón `update` oculto va primero para que Enter en una cantidad actualice y NO vaya a pago. El link "Remove" es `item.url_to_remove`.
- Con JS: +/- y cantidad escrita llaman a `/cart/change.js` (una petición a la vez, en cola), luego se vuelve a pintar la sección con la API de renderizado (`/cart?sections=<id>`), así precios, descuentos y suscripción son siempre los reales de Shopify. Mantiene el foco, anuncia "Cart updated" (región `role=status`) y muestra error si hay stock insuficiente (422). La nota del pedido se guarda en `/cart/update.js`.
- Muestra precio tachado y total de línea con descuento, plan de suscripción por línea, descuentos de carrito y estado vacío.
- Vista previa local: `npm run preview` y abre `/cart`. El servidor simula en memoria la API de carrito de Shopify (`/cart.js`, `/cart/add.js`, `/cart/change.js`, `/cart/update.js`, `?sections=`); agrega desde el producto de prueba. `/__cart/reset` lo vacía. Probado: escritorio, celular 390 px (sin scroll horizontal), sin JS, Enter en cantidad, quitar, estado vacío y foco. Theme Check limpio.
- Pendiente: carrito deslizable (drawer) opcional, barra de envío gratis, productos sugeridos en el carrito, botones de pago exprés (`additional_checkout_buttons`), campo de código de descuento (Shopify lo pide en checkout).

## 12. Colección (hecha 2026-11-22)

- Archivos: `theme/templates/collection.json`, `theme/sections/main-collection.liquid`, `theme/snippets/product-card.liquid` (reutilizable en búsqueda y recomendados), `theme/assets/collection.css`, `src/collection.js` (entrada propia).
- Contenido: migas, título, descripción, conteo, orden (`collection.sort_options`), filtros de Storefront Filtering (`collection.filters`: lista, booleano y rango de precio), chips de filtros activos con "Clear all", cuadrícula 2 a 4 columnas, paginación (`{% paginate %}`, 8 a 24 por página), estado vacío, JSON-LD `CollectionPage` + `ItemList` + `BreadcrumbList`.
- Tarjeta (rediseñada en la sección 13): foto elevada sobre superficie oscura, segunda foto al pasar el mouse (solo con hover real), insignias Sold out / Sale, "From" si el precio varía, enlace que cubre toda la tarjeta y foco visible. Ajuste `image_fit` (contain con multiply para fotos sobre blanco, o cover).
- Sin JS: el formulario es un GET normal (aparece "Apply") y todos los enlaces son URLs reales. Con JS: filtros, orden y páginas se actualizan sin recargar con la API de renderizado (`?sections=`), mantienen el foco y los grupos abiertos, actualizan la URL (botón atrás funciona) y anuncian la cantidad. En celular los filtros van en un desplegable.
- Los filtros solo aparecen si la tienda los configuró en la app Search & Discovery (si `collection.filters` está vacío, se oculta el panel).
- Vista previa local: `/collections/all` (9 productos de prueba, 8 por página, filtros de disponibilidad, tipo y precio, 8 órdenes). El simulador incluye una etiqueta `paginate` propia. Probado: escritorio, celular 390 px, sin JS, atrás, vacío, paginación y hover. Theme Check limpio.
- Pendiente: lista de colecciones (`list-collections.json`), búsqueda (reutilizará la tarjeta), reseñas y productos recomendados.

## 13. Diseño E: paralaje por capas en todo el sitio (2026-11-23)

Santiago eligió la propuesta E (de 5: bento, vidrio, neumorfismo, malla de gradiente, paralaje) para toda la tienda porque las páginas se veían planas y "hechas con IA". Referencia visual: el tablero "Parallax" del lienzo de diseño.

- **Tipografía**: Bricolage Grotesque (títulos, 800, tracking muy cerrado) + DM Sans (texto). Autoalojadas, variables, subconjunto latino, ~78 KB (`theme/assets/font-display.woff2`, `font-body.woff2`; `theme/snippets/fonts.liquid` hace preload con `preload_tag`). Licencia SIL OFL en `docs/LICENSE-bricolage-grotesque.txt` y `docs/LICENSE-dm-sans.txt` (hay que incluirlas en el ZIP). Se quitaron las etiquetas en mayúsculas con tracking y el texto con degradado.
- **Color y luz** (`theme/snippets/css-variables.liquid`): fondo #120B07, texto crema #FFF1DE, apagado #E6D5BD, eyebrow #FFD9A0, acento coral #E8603F (ajuste del tema) con texto oscuro #1B0F09. Una sola fuente de luz: `--highlight` (borde superior claro) + `--shadow-1/2/3` (sombras apiladas) + `--shadow-accent`; grano SVG (`--grain`); radios 10/12/18. Los colores base siguen siendo ajustes del tema.
- **Paralaje** (`src/depth.js`): solo escribe `--px/--py` (puntero, suavizado) y `--sy` (scroll) en el elemento `[data-depth-scene]`. Cada capa (`.layer` en `theme/assets/scene.css`) define su recorrido con `--k` (puntero) y `--s` (scroll), y el CSS arma el transform (así el giro o escala viven en CSS). Respeta el ajuste "Depth effects" (`html[data-depth]`: full = puntero + scroll, light = solo scroll, off = quieto) y `prefers-reduced-motion`. Sin JS la escena es una imagen fija. Pausa cuando no está visible. Se vuelve a enlazar en `shopify:section:load` del editor.
- **Escena de producto** (`main-product.liquid`): foto de fondo (ajuste `scene_image`, si está vacío hay degradado cálido), niebla, bolsa flotante rotada que cambia con la variante (JS copia la foto desde la galería, con fundido), nombre gigante, panel de compra oscuro con luz superior, hojas (`show_leaves`). Los bloques se reparten en tres zonas por tipo: titular (`title`, `tasting_notes`), panel (`price`, `variant_picker`, `selling_plan`, `buy_buttons`, `trust_row`, `@app`) y debajo (`roast_scale`, `description`, `accordion`); el orden en el editor manda dentro de cada zona. Se renderizan con `theme/snippets/pdp-block.liquid` (se le pasa `product` explícito). Galería debajo, en tarjetas elevadas; si solo hay una foto no se muestra. Ajuste `image_fit` cover/contain; se quitó `blend_images`. En celular la escena se apila y queda la barra inferior de compra.
- **Colección y carrito**: franja de escena arriba (`.scene--band`, `theme/assets/scene.css`) con foto, niebla, hojas y título grande en capa; mismos ajustes `scene_image` y `show_leaves` en cada sección. Tarjetas de producto elevadas (se levantan al pasar el mouse), resumen del carrito con el mismo panel oscuro del producto y botón coral. `.scene` usa `overflow: clip` para que el resumen `sticky` siga funcionando.
- Vista previa: el simulador inyecta `scene_image` (fotos de `preview-images/`) y tiene el filtro `preview_tag`/`preload_tag`; reinicia `npm run preview` tras cambiar `scripts/_render.mjs`.
- Probado (2026-11-23): escritorio 1440 y celular 390, puntero y scroll mueven las capas, con reduced-motion no se mueve nada, cambio de variante cambia la bolsa, agregar al carrito, consola sin errores, Theme Check limpio. Portada con las nuevas fuentes sin cortes (el fondo del hero lee `--color-bg`).
- Pendiente de este diseño: aplicarlo a las páginas que faltan (lista de colecciones, página, contacto, blog, artículo, búsqueda, 404, contraseña, tarjeta de regalo) con la misma franja `.scene--band`; revisar `.roast-sim` y secciones de la portada que aún tienen el panel claro (el de anatomía es claro a propósito).
