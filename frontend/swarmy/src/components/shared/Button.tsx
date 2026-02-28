interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'default' | 'sm'
}

export function Button({
  variant = 'secondary',
  size = 'default',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'btn',
    `btn-${variant}`,
    size === 'sm' ? 'btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}
