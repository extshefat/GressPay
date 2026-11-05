import * as React from "react";
import { Button, type ButtonProps } from "./button";
export interface IconButtonProps extends Omit<ButtonProps,"size"> { size?: "xs"|"sm"|"md"|"lg"; label:string; }
export const IconButton=React.forwardRef<HTMLButtonElement,IconButtonProps>(({label,size="md",type="button",...props},ref)=><Button ref={ref} type={type} {...props} iconOnly size={size==="xs"?"sm":size} aria-label={label} title={label}/>);
IconButton.displayName="IconButton";
