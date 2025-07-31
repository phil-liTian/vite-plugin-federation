import React from 'react';
import type { CSSProperties } from 'react';

/**
 * 标签类型
 */
export type TagType = 'default' | 'primary' | 'success' | 'warning' | 'danger';

/**
 * 标签属性接口
 */
export interface TagProps {
  /**
   * 标签内容
   */
  children: React.ReactNode;
  
  /**
   * 标签类型
   */
  type?: TagType;
  
  /**
   * 是否可关闭
   */
  closable?: boolean;
  
  /**
   * 关闭事件处理函数
   */
  onClose?: (e: React.MouseEvent<HTMLSpanElement>) => void;
  
  /**
   * 自定义样式
   */
  style?: CSSProperties;
  
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 标签组件
 */
export const Tag: React.FC<TagProps> = ({
  children,
  type = 'default',
  closable = false,
  onClose,
  style,
  className,
}) => {
  // 标签类型对应的样式
  const typeStyles: Record<TagType, CSSProperties> = {
    default: {
      backgroundColor: '#f0f0f0',
      color: '#333',
      borderColor: '#d9d9d9',
    },
    primary: {
      backgroundColor: '#e6f7ff',
      color: '#1890ff',
      borderColor: '#91d5ff',
    },
    success: {
      backgroundColor: '#f6ffed',
      color: '#52c41a',
      borderColor: '#b7eb8f',
    },
    warning: {
      backgroundColor: '#fffbe6',
      color: '#faad14',
      borderColor: '#ffe58f',
    },
    danger: {
      backgroundColor: '#fff1f0',
      color: '#ff4d4f',
      borderColor: '#ffa39e',
    },
  };

  // 基础样式
  const baseStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    height: '22px',
    padding: '0 7px',
    fontSize: '12px',
    lineHeight: '20px',
    whiteSpace: 'nowrap',
    borderRadius: '2px',
    border: '1px solid',
    boxSizing: 'border-box',
    cursor: 'default',
    ...typeStyles[type],
    ...style,
  };

  // 关闭按钮样式
  const closeStyle: CSSProperties = {
    marginLeft: '3px',
    color: 'inherit',
    fontWeight: 'bold',
    fontSize: '12px',
    lineHeight: '1',
    cursor: 'pointer',
    opacity: 0.7,
  };

  // 处理关闭事件
  const handleClose = (e: React.MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
    onClose?.(e);
  };

  return (
    <div style={baseStyle} className={className}>
      <span>{children}</span>
      {closable && (
        <span
          style={closeStyle}
          onClick={handleClose}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '0.7')}
        >
          ×
        </span>
      )}
    </div>
  );
};