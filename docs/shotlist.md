# Shot List — Cafe Scroll M4 v2 (Cinematic Depth)

Tabla maestra de movimientos de cámara, transformaciones de capas y sincronización de texto HTML a lo largo del scroll en la tienda.

| # | Escena | Scroll | Movimiento firma | Texto HTML sincronizado |
|---|---|---|---|---|
| 1 | **Hero** | 0–35% del pin (0–105vh) | **Zoom hacia la bolsa en la plantación**: `image_far` escala de 1.0 a 1.6 con transform-origin centrado en `(focus_x, focus_y)` (62%, 58%). Parallax de capas a ritmos distintos (fondo 0.3x, texto 1.0x). | H1 dividido por líneas sube y se desvanece con escalonado sutil; subtexto baja opacidad a 0. |
| 2 | **Hero** | 30–100% del pin (90–300vh) | **Iris macro + salto de grano**: `image_macro` se revela con `clip-path: circle()` expandiéndose desde 0% hasta 100% centrado en el foco; `image_far` se desvanece. Si existe `image_bean_cutout`, el grano salta en arco (55–80%) hacia la cámara, escala de 0.3 a 1.0 y aterriza antes de fundir a fondo espresso. | Etiqueta mono (`01 / Terroir & Cultivo`) entra con fundido en 70–100% preparando la siguiente escena. |
| 3 | **Bean Anatomy** | 0–100% del pin (~250vh) | **Dolly + orbit + rotación completa**: Cámara amortiguada con `THREE.MathUtils.damp` realiza dolly lento (z: 15 a 11) y leve orbit horizontal (±8°). El grano 3D rota 360° en Y sobre su eje, manteniendo flotación sinusoidal continua en Y (`sin(t * 1.6) * 0.06`) y balanceo en Z (`±0.04`). | 4 tarjetas anatómicas se iluminan progresivamente en 15%, 35%, 55% y 75% del scroll (opacidad 0.25 a 1.0, línea conectora `scaleX` 0 a 1). |
| 4 | **Simulador de Tueste** | Libre (sin pin) | **Morfogénesis interactiva + parallax al puntero**: El grano 3D interpola dinámicamente color, rugosidad, clearcoat y arrugas (`morphTargetInfluences[0]` de 0 a 1) en respuesta al slider y botones de etapa. Cámara reacciona sutilmente al puntero del ratón con amortiguación. Al pulsar una etapa se produce un pequeño "pop" de escala (1.0 → 1.04 → 1.0 en 250ms). | Lectura digital de temperatura en °C, barras sensoriales (Acidez, Cuerpo, Dulzor) y resaltado activo en la tabla comparativa HTML. |
| 5 | **Catálogo & CTA** | Libre (sin pin) | **Entrada escalonada + elevación**: Tarjetas de producto se revelan secuencialmente con `translateY(24px)` a `0` y fundido de opacidad al entrar en viewport. Nombre de marca gigante en pie de página sube con parallax leve (`yPercent: 0 a -8`). Elevación al hover solo vía CSS (`translateY(-8px)`). | Título de catálogo, tarjetas de variedades con botón de compra ("Comprar") y marca de agua en footer. |

## Movimientos firma seleccionados
Solo se han implementado los movimientos firma autorizados sin añadir transformaciones superfluas:
1. Zoom hacia la bolsa (Hero 1)
2. Iris circular macro + arco del grano (Hero 2)
3. Dolly (z: 15→11) + orbit (±8°) + rotación completa 360° (Bean 3)
4. Morfología continua de tueste + parallax de puntero (Simulador 4)
5. Escalonado de tarjetas + parallax de marca (Catálogo / Footer 5)
