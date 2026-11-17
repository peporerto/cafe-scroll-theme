# Notas de licencias

Revisado el 2026-11-15 (Actualizado para M4 v2). No es asesoría legal.

## Por qué no usamos Skeleton

El README del tema Skeleton de Shopify dice "MIT", pero su archivo `LICENSE.md` añade una condición: los derechos solo pueden ejercerse para desarrollar temas que se integren con Shopify y, "si aplica", distribuirlos o venderlos mediante el Shopify Theme Store; "todos los demás usos están estrictamente prohibidos".

Vamos a vender este tema fuera del Theme Store (Etsy), así que no copiamos archivos de Skeleton. El tema de esta carpeta está escrito desde cero usando solo la API pública de Liquid y la estructura de archivos que Shopify documenta (layout, sections, templates, config, locales).

Si algún día quieres partir de Skeleton o de Dawn, pregunta primero por escrito a Shopify (soporte de Partners).

## Dependencias de JavaScript

| Paquete | Licencia | Nota |
|---|---|---|
| three | MIT | Se incluye empaquetado en el tema |
| lenis | MIT | Se incluye empaquetado en el tema |
| gsap | "Standard no charge license" de GSAP | Uso comercial gratis con su licencia estándar. Confirmar por escrito con GreenSock si el comerciante final puede configurar efectos de animación desde el editor del tema Shopify (campos de ajustes de tema). |
| esbuild, @shopify/cli | MIT | Solo herramientas de desarrollo, no se distribuyen |

### Detalle de Licencia GSAP (GreenSock)

GSAP y su plugin ScrollTrigger están integrados bajo la Licencia Estándar de GSAP ("Standard 'No Charge' License").
- **Uso comercial estándar**: Gratuito en sitios web comerciales, tiendas de comercio electrónico y temas de Shopify estándar, siempre que no se cobre una tarifa de suscripción periódica a múltiples usuarios finales específicamente por acceder al software animado.
- **Configuración desde el Editor de Shopify**: Dado que el tema permite al comerciante seleccionar opciones de movimiento (`motion_level`) y efectos de profundidad (`depth_effects`) mediante controles nativos del editor de temas de Shopify, se recomienda obtener confirmación por escrito de GreenSock (licensing@greensock.com) antes de distribuir comercialmente a terceros, verificando que la exposición de dichos ajustes no se clasifique como herramienta de creación visual sujeta a la licencia comercial "Business Green".

## Activos

Cada foto, textura o modelo 3D que entre al tema debe ser propio, CC0 o tener términos comerciales claros.

| Archivo | Generador | Fecha | Términos comerciales | Notas |
|---|---|---|---|---|
| `theme/assets/hero-*.webp` | — | — | Pendiente | Hero 16:9. Revisar TOS del generador antes de publicar |
| `theme/assets/macro-beans-*.webp` | — | — | Pendiente | Macro de granos 16:9 |
| `theme/assets/bean-green.webp … bean-verydark.webp` | — | — | Pendiente | 5 imágenes estáticas de etapas de tueste (fallback del bean-lab) |
| `theme/assets/catalog-wall-*.webp` | — | — | Pendiente | Pared catálogo 16:9 |
| `theme/assets/bag-cherry.webp … bag-ochre.webp` | — | — | Pendiente | 4 bolsas de producto, una por variedad |

### Referencias de términos de uso por herramienta (actualizar si cambian)

| Herramienta | Uso comercial | URL TOS (revisar en el momento de generar) |
|---|---|---|
| Google Whisk | Permitido; sin garantías de exclusividad de estilo | https://labs.google/tos |
| Google Flow | Permitido; sin garantías de exclusividad de estilo | https://labs.google/tos |
| Nano Banana (Imagen 3 / ImageFX) | Permitido; sin garantías de exclusividad de estilo | https://aitestkitchen.withgoogle.com/tools/image-fx/faq |

## Bean-lab (renderizador Three.js de granos)

Código propio, escrito desde cero. Usa la librería Three.js (MIT). Se integra en `bean-lab/` como herramienta de desarrollo y en M4 como componente interactivo del tema.

| Componente | Licencia | Notas |
|---|---|---|
| `bean-lab/src/main.js` | Propietario (obra propia) | Renderizador de granos con geometría procedural |
| `bean-lab/dist/bean-lab.js` | Propietario + Three.js MIT | Bundle compilado; incluye Three.js r160+ |
| `bean-lab/shoot.cjs` | Propietario (obra propia) | Script de captura con Playwright (dev only) |
| Three.js (dentro del bundle) | MIT | Copyright 2010-2026 Three.js Authors |

## Imágenes de demostración (preview-images/)
- Generadas con Google Gemini (imágenes de IA) el 2026-11-16 a partir de los prompts de PROMPTS_imagenes_M2.md. `hero-cutout.png` es un recorte propio de una de ellas.
- PENDIENTE antes de vender: confirmar por escrito que los términos de Gemini permiten uso comercial y redistribución dentro de una plantilla. Mientras tanto no se incluyen en el ZIP del tema; el comprador sube las suyas.
