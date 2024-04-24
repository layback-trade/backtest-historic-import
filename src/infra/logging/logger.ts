export interface Logger {
  warn(message: string): Promise<void>
  error(message: string): Promise<void>
  info(message: string): Promise<void>
}
