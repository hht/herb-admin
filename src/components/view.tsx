import { AnimatePresence, motion, type HTMLMotionProps } from "motion/react"
import React, { type FC } from "react"

import { cn } from "~/libs/utils"

export const Screen: FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <div className={cn("flex w-screen h-screen", className)} {...rest}>
      {children}
    </div>
  )
}

export const View: FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <div
      className={cn(
        "flex flex-col w-full mx-auto max-w-5xl px-4 items-center",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}
export const Row: FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <div className={cn("flex items-center", className)} {...rest}>
      {children}
    </div>
  )
}
export const Col: FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <div className={cn("flex flex-col", className)} {...rest}>
      {children}
    </div>
  )
}

export const Centered: FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <div
      className={cn(
        "flex w-full h-full justify-center items-center",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export const Animated: FC<HTMLMotionProps<"div">> = ({
  children,
  className,
  ...rest
}) => {
  return (
    <motion.div layout className={className} {...rest}>
      {children}
    </motion.div>
  )
}

export const ScaleIn: FC<HTMLMotionProps<"div"> & { visible?: boolean }> = ({
  visible,
  ...props
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ scale: 0.5 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.5 }}
          transition={{ duration: 0.2, ease: "linear" }}
          {...props}
        />
      )}
    </AnimatePresence>
  )
}

export const FadeIn: FC<HTMLMotionProps<"div"> & { visible?: boolean }> = ({
  visible,
  ...props
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.5 }}
          transition={{ duration: 0.2, ease: "linear" }}
          {...props}
        />
      )}
    </AnimatePresence>
  )
}

export const Justified: FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className,
  ...rest
}) => {
  return (
    <div
      className={cn("flex items-center flex-wrap justify-between", className)}
      {...rest}
    />
  )
}

export const GradientCard: FC<HTMLMotionProps<"div">> = ({
  className,
  ...rest
}) => {
  return (
    <motion.div
      className={cn(
        "flex p-8 bg-card bg-gradient-to-l from-[#16251e] via-[#101613] via-[50%] rounded-md  to-[#101010]",
        className
      )}
      {...rest}
    />
  )
}
