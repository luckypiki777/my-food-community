precision highp float;

/** @resolution */
uniform vec2 u_resolution;

/** @time */
uniform float u_time;

/**
 * @label Color
 * @color
 * @default #D93E1B
 */
uniform vec3 u_color;

/**
 * @label Thickness
 * @range 0.05, 0.4
 * @default 0.16
 */
uniform float u_thickness;

/**
 * @label Speed
 * @range 0.2, 3.0
 * @default 1.0
 */
uniform float u_speed;

#define PI 3.14159265

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;
  float r = length(uv);
  float radius = 0.5 - u_thickness * 0.5 - 0.03;
  float halfT = u_thickness * 0.5;
  float ring = 1.0 - smoothstep(halfT, halfT + 0.035, abs(r - radius));
  float ang = atan(uv.y, uv.x);
  float a = (ang + PI) / (2.0 * PI);
  float head = fract(u_time * u_speed);
  float d = fract(head - a);
  float comet = 1.0 - smoothstep(0.0, 0.8, d);
  float alpha = ring * comet;
  gl_FragColor = vec4(u_color, alpha);
}
