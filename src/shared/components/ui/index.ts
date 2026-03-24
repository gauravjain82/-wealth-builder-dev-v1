/**
 * Shared UI Components
 * Export all reusable UI components from a single entry point
 */

// Form Components
export { Button, buttonVariants } from './button';
export type { ButtonProps } from './button';

export { Input } from './input';
export type { InputProps } from './input';

export { Label } from './label';
export type { LabelProps } from './label';

// Layout Components
export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from './card';

// Typography Components
export {
  Heading,
  Text,
  Link,
  Blockquote,
  Code,
  List,
  ListItem,
  Divider,
  Badge,
  headingVariants,
  textVariants,
  linkVariants,
  codeVariants,
  dividerVariants,
  badgeVariants,
} from './typography';
export type {
  HeadingProps,
  TextProps,
  LinkProps,
  BlockquoteProps,
  CodeProps,
  ListProps,
  ListItemProps,
  DividerProps,
  BadgeProps,
} from './typography';
