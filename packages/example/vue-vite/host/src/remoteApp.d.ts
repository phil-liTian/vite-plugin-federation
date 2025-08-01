/*
 * @Author: phil
 * @Date: 2025-08-01 10:24:56
 */
declare module 'remoteApp/Button' {
  export interface ButtonProps {
    // 属性定义
    children?: React.ReactNode
  }
  export const Button: React.FC<ButtonProps>
}
