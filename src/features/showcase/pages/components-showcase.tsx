/**
 * UI Components Showcase
 * This page demonstrates all available reusable UI components
 * Use this as a reference when building new features
 */

import {
  Heading,
  Text,
  Link,
  Badge,
  Code,
  List,
  ListItem,
  Blockquote,
  Divider,
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@shared/components/ui';
import { Plus, Download, Settings } from 'lucide-react';

export default function ComponentsShowcase() {
  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <Heading as="h1" variant="h1">
          UI Components Showcase
        </Heading>
        <Text variant="muted">
          A comprehensive demonstration of all reusable UI components available in the design system.
        </Text>
      </div>

      <Divider />

      {/* Typography Section */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Typography
        </Heading>

        <Card>
          <CardHeader>
            <CardTitle>Headings</CardTitle>
            <CardDescription>Six semantic heading levels with responsive sizes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Heading as="h1" variant="h1">
                Heading 1
              </Heading>
              <Code>variant="h1"</Code>
            </div>
            <div>
              <Heading as="h2" variant="h2">
                Heading 2
              </Heading>
              <Code>variant="h2"</Code>
            </div>
            <div>
              <Heading as="h3" variant="h3">
                Heading 3
              </Heading>
              <Code>variant="h3"</Code>
            </div>
            <div>
              <Heading as="h4" variant="h4">
                Heading 4
              </Heading>
              <Code>variant="h4"</Code>
            </div>
            <div>
              <Heading as="h5" variant="h5">
                Heading 5
              </Heading>
              <Code>variant="h5"</Code>
            </div>
            <div>
              <Heading as="h6" variant="h6">
                Heading 6
              </Heading>
              <Code>variant="h6"</Code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Text Variants</CardTitle>
            <CardDescription>Different text styles for various use cases</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Text variant="lead">
                Lead text: A larger, lighter introduction paragraph that stands out from body text.
              </Text>
              <Code>variant="lead"</Code>
            </div>
            <div>
              <Text variant="large">
                Large text: Slightly bigger than body text for emphasis.
              </Text>
              <Code>variant="large"</Code>
            </div>
            <div>
              <Text variant="body">
                Body text: Regular paragraph text with comfortable line height for readability.
              </Text>
              <Code>variant="body"</Code>
            </div>
            <div>
              <Text variant="small">
                Small text: Reduced size for secondary information or metadata.
              </Text>
              <Code>variant="small"</Code>
            </div>
            <div>
              <Text variant="muted">Muted text: Subdued styling for helper text.</Text>
              <Code>variant="muted"</Code>
            </div>
            <div>
              <Text variant="tiny">Tiny text: Smallest size for fine print.</Text>
              <Code>variant="tiny"</Code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Links</CardTitle>
            <CardDescription>Styled anchor elements with variants</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div className="space-y-2">
              <Link href="#">Default Link</Link>
              <Code>variant="default"</Code>
            </div>
            <div className="space-y-2">
              <Link href="#" variant="muted">
                Muted Link
              </Link>
              <Code>variant="muted"</Code>
            </div>
            <div className="space-y-2">
              <Link href="#" variant="subtle">
                Subtle Link
              </Link>
              <Code>variant="subtle"</Code>
            </div>
            <div className="space-y-2">
              <Link href="#" variant="discrete">
                Discrete Link
              </Link>
              <Code>variant="discrete"</Code>
            </div>
          </CardContent>
        </Card>
      </section>

      <Divider />

      {/* Badges Section */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Badges
        </Heading>

        <Card>
          <CardHeader>
            <CardTitle>Badge Variants</CardTitle>
            <CardDescription>Status indicators and labels</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </CardContent>
        </Card>
      </section>

      <Divider />

      {/* Buttons Section */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Buttons
        </Heading>

        <Card>
          <CardHeader>
            <CardTitle>Button Variants</CardTitle>
            <CardDescription>Different button styles for various actions</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button Sizes</CardTitle>
            <CardDescription>Different button sizes</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Button States</CardTitle>
            <CardDescription>Disabled and loading states</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button disabled>Disabled</Button>
            <Button>
              <Download className="w-4 h-4 mr-2" />
              With Icon
            </Button>
          </CardContent>
        </Card>
      </section>

      <Divider />

      {/* Form Section */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Form Components
        </Heading>

        <Card>
          <CardHeader>
            <CardTitle>Input Fields</CardTitle>
            <CardDescription>Text inputs with labels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="Enter your name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="disabled">Disabled Input</Label>
              <Input id="disabled" disabled placeholder="Disabled input" />
            </div>
          </CardContent>
        </Card>
      </section>

      <Divider />

      {/* Lists Section */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Lists
        </Heading>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Unordered List</CardTitle>
              <CardDescription>Bulleted list items</CardDescription>
            </CardHeader>
            <CardContent>
              <List>
                <ListItem>First list item</ListItem>
                <ListItem>Second list item</ListItem>
                <ListItem>Third list item with more content</ListItem>
                <ListItem>Fourth list item</ListItem>
              </List>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ordered List</CardTitle>
              <CardDescription>Numbered list items</CardDescription>
            </CardHeader>
            <CardContent>
              <List ordered>
                <ListItem>First step in the process</ListItem>
                <ListItem>Second step follows</ListItem>
                <ListItem>Third step continues</ListItem>
                <ListItem>Final step completes</ListItem>
              </List>
            </CardContent>
          </Card>
        </div>
      </section>

      <Divider />

      {/* Other Components */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Other Components
        </Heading>

        <Card>
          <CardHeader>
            <CardTitle>Blockquote</CardTitle>
            <CardDescription>Styled quote blocks</CardDescription>
          </CardHeader>
          <CardContent>
            <Blockquote>
              "The way to get started is to quit talking and begin doing."
            </Blockquote>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Code</CardTitle>
            <CardDescription>Inline and block code formatting</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Text>
                Run <Code>npm install</Code> to install dependencies.
              </Text>
            </div>
            <Code variant="block">
              {`function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return true;
}`}
            </Code>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dividers</CardTitle>
            <CardDescription>Horizontal and vertical separators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Text variant="small" weight="semibold">
                Small spacing
              </Text>
              <Divider spacing="sm" />
              <Text variant="small">Content after divider</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold">
                Medium spacing (default)
              </Text>
              <Divider spacing="md" />
              <Text variant="small">Content after divider</Text>
            </div>
            <div>
              <Text variant="small" weight="semibold">
                Large spacing
              </Text>
              <Divider spacing="lg" />
              <Text variant="small">Content after divider</Text>
            </div>
          </CardContent>
        </Card>
      </section>

      <Divider />

      {/* Cards Section */}
      <section className="space-y-6">
        <Heading as="h2" variant="h2">
          Cards
        </Heading>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Simple Card</CardTitle>
              <CardDescription>Basic card with header and content</CardDescription>
            </CardHeader>
            <CardContent>
              <Text>This is a simple card with just a header and content.</Text>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Card with Footer</CardTitle>
              <CardDescription>Includes footer with actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Text>This card has a footer section for action buttons.</Text>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button size="sm">Action</Button>
              <Button size="sm" variant="outline">
                Cancel
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interactive Card</CardTitle>
              <CardDescription>With icon and badge</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-muted-foreground" />
                <Badge variant="success">Active</Badge>
              </div>
              <Text variant="small">Cards can contain any combination of components.</Text>
            </CardContent>
          </Card>
        </div>
      </section>

      <Divider spacing="lg" />

      {/* Footer */}
      <div className="text-center space-y-2 pb-12">
        <Text variant="muted">
          For usage examples and best practices, see{' '}
          <Link href="#">UI_COMPONENTS_GUIDE.md</Link>
        </Text>
        <Text variant="tiny">Always use these reusable components instead of raw HTML elements</Text>
      </div>
    </div>
  );
}
