import React from 'react';
import { Svg, Path, Rect, SvgProps } from 'react-native-svg';

// Definimos a interface para o TypeScript entender as propriedades
interface IconProps extends SvgProps {
  color: string;
  size?: number;
}

export const IconAlmoxarifado = ({ color, size = 24, ...props }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
    <Path 
      d="M3 21h18M3 10l9-7 9 7v11H3V10Z" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Rect 
      x="7" 
      y="13" 
      width="10" 
      height="4" 
      rx="1" 
      stroke={color} 
      strokeWidth={1.5} 
    />
    <Path 
      d="M12 13v4" 
      stroke={color} 
      strokeWidth={1.5} 
    />
  </Svg>
);