'use client';

import { useState } from 'react';
import {
  Mail,
  Search,
  Plus,
  Trash2,
  Settings,
  User,
  Bell,
  Star,
  ArrowRight,
  ChevronDown,
  Copy,
  Download,
  Share,
  MoreHorizontal,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

// 1. Button
import { Button } from '@/components/ui/button';
// 2. Badge
import { Badge } from '@/components/ui/badge';
// 3. Card
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from '@/components/ui/card';
// 4. Input
import { Input } from '@/components/ui/input';
// 5. Label
import { Label } from '@/components/ui/label';
// 6. Textarea
import { Textarea } from '@/components/ui/textarea';
// 7. Select
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
  SelectSeparator,
} from '@/components/ui/select';
// 8. Separator
import { Separator } from '@/components/ui/separator';
// 9. Skeleton
import { Skeleton } from '@/components/ui/skeleton';
// 10. Table
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
// 11. Alert Dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
// 12. Dropdown Menu
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
// 13. Sheet
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
// 14. Tooltip
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
// 15. Combobox
import {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from '@/components/ui/combobox';
// 16. Tabs
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
// 17. Field
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldSet,
  FieldLegend,
  FieldContent,
  FieldSeparator,
} from '@/components/ui/field';
// 18. Input Group
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupText,
  InputGroupInput,
  InputGroupTextarea,
} from '@/components/ui/input-group';
// 19. Avatar
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from '@/components/ui/avatar';

// --- Section wrapper ---
function Section({
  title,
  number,
  children,
}: {
  title: string;
  number: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
          {number}
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="space-y-6 pl-10">{children}</div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-muted-foreground text-sm font-medium">{title}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// --- Page ---
export default function DashboardOverviewPage() {
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [showActivityBar, setShowActivityBar] = useState(false);
  const [radioValue, setRadioValue] = useState('comfortable');

  return (
    <TooltipProvider>
      <div className="space-y-12">
        <div>
          <h1 className="text-2xl font-bold">UI Component Showcase</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All 20 shadcn/ui primitives with every variant
          </p>
        </div>

        {/* ========== 1. BUTTON ========== */}
        <Section title="Button" number={1}>
          <SubSection title="Variants">
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="link">Link</Button>
          </SubSection>

          <SubSection title="Sizes">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
          </SubSection>

          <SubSection title="Icon Sizes">
            <Button size="icon-xs"><Plus className="size-3" /></Button>
            <Button size="icon-sm"><Plus /></Button>
            <Button size="icon"><Plus /></Button>
            <Button size="icon-lg"><Plus /></Button>
          </SubSection>

          <SubSection title="With Icons">
            <Button><Mail /> Send Email</Button>
            <Button variant="outline"><Download /> Download</Button>
            <Button variant="secondary">Next <ArrowRight /></Button>
            <Button variant="destructive"><Trash2 /> Delete</Button>
          </SubSection>

          <SubSection title="States">
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>Disabled Outline</Button>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 2. BADGE ========== */}
        <Section title="Badge" number={2}>
          <SubSection title="Variants">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="ghost">Ghost</Badge>
            <Badge variant="link">Link</Badge>
          </SubSection>

          <SubSection title="With Icons">
            <Badge><Check className="size-3" /> Verified</Badge>
            <Badge variant="destructive"><AlertTriangle className="size-3" /> Error</Badge>
            <Badge variant="secondary"><Star className="size-3" /> Featured</Badge>
            <Badge variant="outline"><Info className="size-3" /> Info</Badge>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 3. CARD ========== */}
        <Section title="Card" number={3}>
          <SubSection title="Default Size">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here.</CardDescription>
                <CardAction>
                  <Button variant="ghost" size="icon-sm">
                    <MoreHorizontal />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p>Card content with useful information.</p>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Save</Button>
              </CardFooter>
            </Card>
          </SubSection>

          <SubSection title="Small Size">
            <Card size="sm" className="w-full max-w-xs">
              <CardHeader>
                <CardTitle>Small Card</CardTitle>
                <CardDescription>Compact variant.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Less padding for dense layouts.</p>
              </CardContent>
            </Card>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 4. INPUT ========== */}
        <Section title="Input" number={4}>
          <SubSection title="Types">
            <Input placeholder="Text input" className="max-w-xs" />
            <Input type="email" placeholder="Email" className="max-w-xs" />
            <Input type="password" placeholder="Password" className="max-w-xs" />
            <Input type="number" placeholder="Number" className="max-w-xs" />
          </SubSection>

          <SubSection title="States">
            <Input placeholder="Default" className="max-w-xs" />
            <Input disabled placeholder="Disabled" className="max-w-xs" />
            <Input aria-invalid="true" defaultValue="Invalid input" className="max-w-xs" />
          </SubSection>

          <SubSection title="File Input">
            <Input type="file" className="max-w-xs" />
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 5. LABEL ========== */}
        <Section title="Label" number={5}>
          <SubSection title="Basic">
            <div className="grid w-full max-w-xs gap-2">
              <Label htmlFor="label-demo">Email Address</Label>
              <Input id="label-demo" placeholder="you@example.com" />
            </div>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 6. TEXTAREA ========== */}
        <Section title="Textarea" number={6}>
          <SubSection title="Default">
            <Textarea placeholder="Type your message..." className="max-w-sm" />
          </SubSection>
          <SubSection title="States">
            <Textarea disabled placeholder="Disabled textarea" className="max-w-sm" />
            <Textarea aria-invalid="true" defaultValue="Invalid content" className="max-w-sm" />
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 7. SELECT ========== */}
        <Section title="Select" number={7}>
          <SubSection title="Default">
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Fruits</SelectLabel>
                  <SelectItem value="apple">Apple</SelectItem>
                  <SelectItem value="banana">Banana</SelectItem>
                  <SelectItem value="cherry">Cherry</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  <SelectLabel>Vegetables</SelectLabel>
                  <SelectItem value="carrot">Carrot</SelectItem>
                  <SelectItem value="celery">Celery</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </SubSection>

          <SubSection title="Small Trigger">
            <Select>
              <SelectTrigger size="sm" className="w-40">
                <SelectValue placeholder="Small select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a">Option A</SelectItem>
                <SelectItem value="b">Option B</SelectItem>
                <SelectItem value="c">Option C</SelectItem>
              </SelectContent>
            </Select>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 8. SEPARATOR ========== */}
        <Section title="Separator" number={8}>
          <SubSection title="Horizontal">
            <div className="w-full max-w-sm space-y-2">
              <p className="text-sm">Above the separator</p>
              <Separator />
              <p className="text-sm">Below the separator</p>
            </div>
          </SubSection>
          <SubSection title="Vertical">
            <div className="flex h-8 items-center gap-4">
              <span className="text-sm">Left</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Center</span>
              <Separator orientation="vertical" />
              <span className="text-sm">Right</span>
            </div>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 9. SKELETON ========== */}
        <Section title="Skeleton" number={9}>
          <SubSection title="Shapes">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-24 w-48 rounded-2xl" />
          </SubSection>
          <SubSection title="Card Skeleton">
            <div className="w-full max-w-xs space-y-3">
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 10. TABLE ========== */}
        <Section title="Table" number={10}>
          <div className="w-full max-w-2xl">
            <Table>
              <TableCaption>A list of recent invoices.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">INV001</TableCell>
                  <TableCell><Badge variant="default">Paid</Badge></TableCell>
                  <TableCell>Credit Card</TableCell>
                  <TableCell className="text-right">$250.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV002</TableCell>
                  <TableCell><Badge variant="secondary">Pending</Badge></TableCell>
                  <TableCell>PayPal</TableCell>
                  <TableCell className="text-right">$150.00</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">INV003</TableCell>
                  <TableCell><Badge variant="destructive">Overdue</Badge></TableCell>
                  <TableCell>Bank Transfer</TableCell>
                  <TableCell className="text-right">$350.00</TableCell>
                </TableRow>
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-right font-bold">$750.00</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </Section>

        <Separator />

        {/* ========== 11. ALERT DIALOG ========== */}
        <Section title="Alert Dialog" number={11}>
          <SubSection title="Default Size">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account
                    and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SubSection>

          <SubSection title="Small Size">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Confirm Action (Small)</Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No</AlertDialogCancel>
                  <AlertDialogAction>Yes</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 12. DROPDOWN MENU ========== */}
        <Section title="Dropdown Menu" number={12}>
          <SubSection title="Full Example">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Open Menu <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem>
                    <User /> Profile
                    <DropdownMenuShortcut>Ctrl+P</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings /> Settings
                    <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Bell /> Notifications
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Share /> Share
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem><Mail /> Email</DropdownMenuItem>
                    <DropdownMenuItem><Copy /> Copy Link</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={showStatusBar}
                  onCheckedChange={setShowStatusBar}
                >
                  Status Bar
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={showActivityBar}
                  onCheckedChange={setShowActivityBar}
                >
                  Activity Bar
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={radioValue} onValueChange={setRadioValue}>
                  <DropdownMenuLabel>Density</DropdownMenuLabel>
                  <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="spacious">Spacious</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive">
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 13. SHEET ========== */}
        <Section title="Sheet" number={13}>
          <SubSection title="Sides">
            {(['right', 'left', 'top', 'bottom'] as const).map((side) => (
              <Sheet key={side}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="capitalize">{side}</Button>
                </SheetTrigger>
                <SheetContent side={side}>
                  <SheetHeader>
                    <SheetTitle>Sheet from {side}</SheetTitle>
                    <SheetDescription>
                      This sheet slides in from the {side}.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="flex-1 p-6">
                    <p className="text-muted-foreground text-sm">Sheet content goes here.</p>
                  </div>
                  <SheetFooter>
                    <Button className="w-full">Save Changes</Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            ))}
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 14. TOOLTIP ========== */}
        <Section title="Tooltip" number={14}>
          <SubSection title="Positions">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover (Top)</Button>
              </TooltipTrigger>
              <TooltipContent side="top">Tooltip on top</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover (Bottom)</Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Tooltip on bottom</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover (Left)</Button>
              </TooltipTrigger>
              <TooltipContent side="left">Tooltip on left</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline">Hover (Right)</Button>
              </TooltipTrigger>
              <TooltipContent side="right">Tooltip on right</TooltipContent>
            </Tooltip>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 15. COMBOBOX ========== */}
        <Section title="Combobox" number={15}>
          <SubSection title="Basic">
            <Combobox>
              <ComboboxInput placeholder="Search frameworks..." className="w-64" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No results found.</ComboboxEmpty>
                  <ComboboxItem value="next">Next.js</ComboboxItem>
                  <ComboboxItem value="remix">Remix</ComboboxItem>
                  <ComboboxItem value="astro">Astro</ComboboxItem>
                  <ComboboxItem value="nuxt">Nuxt</ComboboxItem>
                  <ComboboxItem value="svelte">SvelteKit</ComboboxItem>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </SubSection>

          <SubSection title="With Clear Button">
            <Combobox>
              <ComboboxInput placeholder="Search..." showClear className="w-64" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No results.</ComboboxEmpty>
                  <ComboboxItem value="react">React</ComboboxItem>
                  <ComboboxItem value="vue">Vue</ComboboxItem>
                  <ComboboxItem value="angular">Angular</ComboboxItem>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 16. TABS ========== */}
        <Section title="Tabs" number={16}>
          <SubSection title="Default Variant (Horizontal)">
            <Tabs defaultValue="account" className="w-full max-w-md">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account">
                <Card>
                  <CardHeader>
                    <CardTitle>Account</CardTitle>
                    <CardDescription>Manage your account settings.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Account tab content goes here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your password.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Password tab content goes here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings">
                <Card>
                  <CardHeader>
                    <CardTitle>Settings</CardTitle>
                    <CardDescription>Configure preferences.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Settings tab content goes here.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </SubSection>

          <SubSection title="Line Variant (Horizontal)">
            <Tabs defaultValue="overview" className="w-full max-w-md">
              <TabsList variant="line">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="overview">
                <p className="text-muted-foreground mt-2 text-sm">Overview content with line-style tabs.</p>
              </TabsContent>
              <TabsContent value="analytics">
                <p className="text-muted-foreground mt-2 text-sm">Analytics content with line-style tabs.</p>
              </TabsContent>
              <TabsContent value="reports">
                <p className="text-muted-foreground mt-2 text-sm">Reports content with line-style tabs.</p>
              </TabsContent>
            </Tabs>
          </SubSection>

          <SubSection title="Vertical Orientation">
            <Tabs defaultValue="general" orientation="vertical" className="w-full max-w-md">
              <TabsList>
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
              </TabsList>
              <TabsContent value="general">
                <Card>
                  <CardContent className="pt-0">
                    <p className="text-sm">General settings panel.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="security">
                <Card>
                  <CardContent className="pt-0">
                    <p className="text-sm">Security settings panel.</p>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="notifications">
                <Card>
                  <CardContent className="pt-0">
                    <p className="text-sm">Notification preferences panel.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </SubSection>

          <SubSection title="Vertical + Line Variant">
            <Tabs defaultValue="tab1" orientation="vertical" className="w-full max-w-md">
              <TabsList variant="line">
                <TabsTrigger value="tab1">Profile</TabsTrigger>
                <TabsTrigger value="tab2">Billing</TabsTrigger>
                <TabsTrigger value="tab3">Team</TabsTrigger>
              </TabsList>
              <TabsContent value="tab1">
                <p className="text-muted-foreground text-sm">Profile content with vertical line tabs.</p>
              </TabsContent>
              <TabsContent value="tab2">
                <p className="text-muted-foreground text-sm">Billing content with vertical line tabs.</p>
              </TabsContent>
              <TabsContent value="tab3">
                <p className="text-muted-foreground text-sm">Team content with vertical line tabs.</p>
              </TabsContent>
            </Tabs>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 17. FIELD ========== */}
        <Section title="Field" number={17}>
          <SubSection title="Vertical (Default)">
            <FieldGroup className="max-w-sm">
              <Field orientation="vertical">
                <FieldLabel>Full Name</FieldLabel>
                <FieldContent>
                  <Input placeholder="John Doe" />
                  <FieldDescription>Enter your full legal name.</FieldDescription>
                </FieldContent>
              </Field>
            </FieldGroup>
          </SubSection>

          <SubSection title="Horizontal">
            <FieldGroup className="max-w-md">
              <Field orientation="horizontal">
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input placeholder="you@example.com" />
                </FieldContent>
              </Field>
            </FieldGroup>
          </SubSection>

          <SubSection title="With Error">
            <FieldGroup className="max-w-sm">
              <Field orientation="vertical" data-invalid="true">
                <FieldLabel>Username</FieldLabel>
                <FieldContent>
                  <Input aria-invalid="true" defaultValue="a" />
                  <FieldError>Username must be at least 3 characters.</FieldError>
                </FieldContent>
              </Field>
            </FieldGroup>
          </SubSection>

          <SubSection title="FieldSet with Legend">
            <FieldSet className="max-w-sm">
              <FieldLegend>Contact Information</FieldLegend>
              <Field>
                <FieldLabel>Phone</FieldLabel>
                <FieldContent>
                  <Input placeholder="+1 (555) 000-0000" />
                </FieldContent>
              </Field>
              <FieldSeparator>or</FieldSeparator>
              <Field>
                <FieldLabel>Email</FieldLabel>
                <FieldContent>
                  <Input placeholder="you@example.com" />
                </FieldContent>
              </Field>
            </FieldSet>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 18. INPUT GROUP ========== */}
        <Section title="Input Group" number={18}>
          <SubSection title="With Inline Start Addon">
            <InputGroup className="max-w-xs">
              <InputGroupAddon align="inline-start">
                <InputGroupText><Search /></InputGroupText>
              </InputGroupAddon>
              <InputGroupInput placeholder="Search..." />
            </InputGroup>
          </SubSection>

          <SubSection title="With Inline End Addon">
            <InputGroup className="max-w-xs">
              <InputGroupInput placeholder="Enter email" />
              <InputGroupAddon align="inline-end">
                <InputGroupText>@gmail.com</InputGroupText>
              </InputGroupAddon>
            </InputGroup>
          </SubSection>

          <SubSection title="With Button">
            <InputGroup className="max-w-xs">
              <InputGroupInput placeholder="Search..." />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="xs" variant="ghost">
                  <Search />
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </SubSection>

          <SubSection title="With Block Start Addon">
            <InputGroup className="max-w-xs">
              <InputGroupAddon align="block-start">
                <InputGroupText><Mail /> Email Address</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput placeholder="you@example.com" />
            </InputGroup>
          </SubSection>

          <SubSection title="With Textarea">
            <InputGroup className="max-w-sm">
              <InputGroupAddon align="block-end">
                <InputGroupButton size="xs">Send</InputGroupButton>
              </InputGroupAddon>
              <InputGroupTextarea placeholder="Type a message..." />
            </InputGroup>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 19. AVATAR ========== */}
        <Section title="Avatar" number={19}>
          <SubSection title="Sizes">
            <Avatar size="sm">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar size="default">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
          </SubSection>

          <SubSection title="Fallback">
            <Avatar>
              <AvatarFallback>AB</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>CD</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>
                <User className="size-4" />
              </AvatarFallback>
            </Avatar>
          </SubSection>

          <SubSection title="With Badge">
            <Avatar size="lg">
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>CN</AvatarFallback>
              <AvatarBadge />
            </Avatar>
            <Avatar size="default">
              <AvatarFallback>AB</AvatarFallback>
              <AvatarBadge />
            </Avatar>
          </SubSection>

          <SubSection title="Avatar Group">
            <AvatarGroup>
              <Avatar>
                <AvatarImage src="https://github.com/shadcn.png" alt="User 1" />
                <AvatarFallback>U1</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>U2</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>U3</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>U4</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>+5</AvatarGroupCount>
            </AvatarGroup>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 20. SIDEBAR ========== */}
        <Section title="Sidebar" number={20}>
          <SubSection title="(See left sidebar)">
            <Card className="w-full max-w-md">
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  The Sidebar component is used as the main navigation on the left side of this
                  page. It includes: SidebarProvider, Sidebar, SidebarHeader, SidebarContent,
                  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
                  SidebarMenuButton, SidebarFooter, SidebarTrigger, SidebarSeparator, and more.
                </p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Press <kbd className="bg-muted rounded px-1.5 py-0.5 text-xs font-mono">Ctrl+B</kbd> to
                  toggle the sidebar.
                </p>
              </CardContent>
            </Card>
          </SubSection>
        </Section>

        <div className="h-12" />
      </div>
    </TooltipProvider>
  );
}
