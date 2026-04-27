import React from 'react';
import { Svg, Path, SvgProps } from 'react-native-svg';

interface IconProps extends SvgProps {
  color: string;
  size?: number;
}

export const IconRelatorios = ({ color, size = 24, ...props }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" {...props}>
    {/* Contorno do Documento com a ponta dobrada */}
    <Path 
      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Detalhe da dobra superior direita */}
    <Path 
      d="M14 2v6h6" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Linhas de texto/dados do relatório */}
    <Path 
      d="M16 13H8" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Path 
      d="M16 17H8" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    <Path 
      d="M10 9H8" 
      stroke={color} 
      strokeWidth={1.5} 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </Svg>
);