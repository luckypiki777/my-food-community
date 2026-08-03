precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Base
 * @color
 * @default #D9D9D7
 */
uniform vec3 u_base;

/**
 * @label Highlight
 * @color
 * @default #EDEDEC
 */
uniform vec3 u_highlight;

/**
 * @label Speed
 * @range 0.2, 3.0
 * @default 1.0
 */
uniform float u_speed;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float pos = uv.x * 0.85 + uv.y * 0.15;
  float center = fract(u_time * 0.5 * u_speed) * 1.6 - 0.3;
  float hl = exp(-pow((pos - center) / 0.16, 2.0));
  vec3 col = mix(u_base, u_highlight, hl * 0.9);
  gl_FragColor = vec4(col, 1.0);
}
