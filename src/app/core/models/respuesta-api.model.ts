export interface RespuestaAPI<T = any> {
  status: boolean;
  mensaje: string;
  resultado?: T;
  [key: string]: any;
}
