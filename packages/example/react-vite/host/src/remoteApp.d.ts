declare module 'remoteApp/Tag' {
  export interface TagProps {
    // 属性定义
    type: string,
    children: React.ReactNode
  }
  export const Tag: React.FC<TagProps>;
}


declare module 'remoteApp/Button' {
  export interface ButtonProps {
    // 属性定义
    children?: React.ReactNode
  }
  export const Button: React.FC<ButtonProps>;
}



