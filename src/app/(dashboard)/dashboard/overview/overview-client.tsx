'use client';

import { useState, Suspense } from 'react';
import { cn } from '@/lib/utils';
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
// 7. Select (removed — replaced by Combobox import below)
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
  AlertDialogMedia,
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
  ComboboxGroup,
  ComboboxLabel,
  ComboboxEmpty,
  ComboboxCollection,
  ComboboxSeparator,
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
import { Checkbox } from '@/components/ui/checkbox';
// 20. DataTable
import { DataTable, DataTableColumnHeader } from '@/components/ui/data-table';
import type { ColumnDef } from '@tanstack/react-table';
// 21. Sonner
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
// 22. Spinner
import { Spinner } from '@/components/ui/spinner';
// 23. MultiSelect
import { MultiSelect } from '@/components/ui/multi-select';
// 24. Avatar (renumbered)
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarBadge,
} from '@/components/ui/avatar';

// --- DataTable demo data ---
type DemoUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
};

const demoUsers: DemoUser[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'active' },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'active' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Viewer', status: 'inactive' },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', status: 'active' },
  { id: '5', name: 'Eve Wilson', email: 'eve@example.com', role: 'Editor', status: 'active' },
  { id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'Viewer', status: 'inactive' },
  { id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'Editor', status: 'active' },
  { id: '8', name: 'Hank Green', email: 'hank@example.com', role: 'Viewer', status: 'active' },
  { id: '9', name: 'Iris Chen', email: 'iris@example.com', role: 'Admin', status: 'active' },
  { id: '10', name: 'Jack Davis', email: 'jack@example.com', role: 'Editor', status: 'inactive' },
  { id: '11', name: 'Karen White', email: 'karen@example.com', role: 'Viewer', status: 'active' },
  { id: '12', name: 'Leo Martinez', email: 'leo@example.com', role: 'Editor', status: 'active' },
];

const demoColumns: ColumnDef<DemoUser>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Name" />,
  },
  {
    accessorKey: 'email',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
  },
  {
    accessorKey: 'role',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      return (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
        )}>
          {status}
        </span>
      );
    },
  },
];

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
export default function DashboardOverviewClient() {
  const [showStatusBar, setShowStatusBar] = useState(true);
  const [showActivityBar, setShowActivityBar] = useState(false);
  const [radioValue, setRadioValue] = useState('comfortable');

  return (
    <TooltipProvider>
      <div className="space-y-12">
        <div>
          <h1 className="text-2xl font-bold">UI Component Showcase</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            All 26 shadcn/ui primitives with every variant
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
            <Textarea placeholder="Type your message…" className="max-w-sm" />
          </SubSection>
          <SubSection title="States">
            <Textarea disabled placeholder="Disabled textarea" className="max-w-sm" />
            <Textarea aria-invalid="true" defaultValue="Invalid content" className="max-w-sm" />
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 7. COMBOBOX (Searchable Select) ========== */}
        <Section title="Combobox" number={7}>
          <SubSection title="Grouped">
            <Combobox items={['Apple', 'Banana', 'Cherry', 'Carrot', 'Celery']}>
              <ComboboxInput placeholder="Search produce..." className="w-48" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No results found</ComboboxEmpty>
                  <ComboboxGroup>
                    <ComboboxLabel>Fruits</ComboboxLabel>
                    <ComboboxItem value="Apple">Apple</ComboboxItem>
                    <ComboboxItem value="Banana">Banana</ComboboxItem>
                    <ComboboxItem value="Cherry">Cherry</ComboboxItem>
                  </ComboboxGroup>
                  <ComboboxSeparator />
                  <ComboboxGroup>
                    <ComboboxLabel>Vegetables</ComboboxLabel>
                    <ComboboxItem value="Carrot">Carrot</ComboboxItem>
                    <ComboboxItem value="Celery">Celery</ComboboxItem>
                  </ComboboxGroup>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </SubSection>

          <SubSection title="Simple">
            <Combobox items={['Option A', 'Option B', 'Option C']}>
              <ComboboxInput placeholder="Search options..." className="w-40" />
              <ComboboxContent>
                <ComboboxList>
                  <ComboboxEmpty>No results found</ComboboxEmpty>
                  <ComboboxCollection>
                    {(opt) => (
                      <ComboboxItem key={opt} value={opt}>
                        {opt}
                      </ComboboxItem>
                    )}
                  </ComboboxCollection>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
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
          <SubSection title="Default with Media">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10">
                    <Trash2 className="text-destructive" />
                  </AlertDialogMedia>
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

          <SubSection title="Small with Media">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Confirm Action (Small)</Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia>
                    <AlertTriangle className="text-foreground" />
                  </AlertDialogMedia>
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

          <SubSection title="Info with Media">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="secondary">Show Info</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-primary/10">
                    <Info className="text-primary" />
                  </AlertDialogMedia>
                  <AlertDialogTitle>New updates available</AlertDialogTitle>
                  <AlertDialogDescription>
                    A new version of the application is available. Would you like to update now?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Later</AlertDialogCancel>
                  <AlertDialogAction>Update Now</AlertDialogAction>
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
              <ComboboxInput placeholder="Search frameworks…" className="w-64" />
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
              <ComboboxInput placeholder="Search…" showClear className="w-64" />
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
              <InputGroupInput placeholder="Search…" />
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
              <InputGroupInput placeholder="Search…" />
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
              <InputGroupTextarea placeholder="Type a message…" />
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

        {/* ========== 20. CHECKBOX ========== */}
        <Section title="Checkbox" number={20}>
          <SubSection title="States">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox /> Default
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox defaultChecked /> Checked
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox disabled /> Disabled
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox disabled defaultChecked /> Disabled Checked
              </label>
            </div>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 21. DATA TABLE ========== */}
        <Section title="DataTable" number={21}>
          <SubSection title="With Search, Sort, Pagination & Bulk Select">
            <div className="w-full">
              <Suspense fallback={null}>
                <DataTable
                  columns={demoColumns}
                  data={demoUsers}
                  searchKeys={["name"]}
                  searchPlaceholder="Search by name…"
                  enableSelection
                  enablePagination
                  pageSize={5}
                />
              </Suspense>
            </div>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 22. SONNER ========== */}
        <Section title="Sonner (Toast)" number={22}>
          <SubSection title="Toast Types">
            <Button variant="outline" onClick={() => toast('Default toast notification')}>
              Default
            </Button>
            <Button variant="outline" onClick={() => toast.success('Successfully saved!')}>
              Success
            </Button>
            <Button variant="outline" onClick={() => toast.error('Something went wrong')}>
              Error
            </Button>
            <Button variant="outline" onClick={() => toast.warning('Please check your input')}>
              Warning
            </Button>
            <Button variant="outline" onClick={() => toast.info('New update available')}>
              Info
            </Button>
            <Button variant="outline" onClick={() => toast.loading('Loading data...')}>
              Loading
            </Button>
          </SubSection>
          <SubSection title="With Description">
            <Button
              variant="outline"
              onClick={() =>
                toast.success('File uploaded', {
                  description: 'Your file has been uploaded successfully.',
                })
              }
            >
              With Description
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                toast('Event created', {
                  description: 'Monday, January 3rd at 6:00 PM',
                  action: { label: 'Undo', onClick: () => {} },
                })
              }
            >
              With Action
            </Button>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 23. SPINNER ========== */}
        <Section title="Spinner" number={23}>
          <SubSection title="Sizes">
            <Spinner className="size-3" />
            <Spinner />
            <Spinner className="size-6" />
            <Spinner className="size-8" />
          </SubSection>
          <SubSection title="In Button">
            <Button disabled>
              <Spinner className="mr-1" /> Loading...
            </Button>
            <Button variant="outline" disabled>
              <Spinner className="mr-1" /> Saving
            </Button>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 24. MULTI SELECT ========== */}
        <Section title="MultiSelect" number={24}>
          <SubSection title="Basic">
            <div className="w-full max-w-sm">
              <MultiSelect
                options={[
                  { label: 'React', value: 'react' },
                  { label: 'Vue', value: 'vue' },
                  { label: 'Angular', value: 'angular' },
                  { label: 'Svelte', value: 'svelte' },
                  { label: 'Next.js', value: 'nextjs' },
                  { label: 'Nuxt', value: 'nuxt' },
                  { label: 'Remix', value: 'remix' },
                  { label: 'Astro', value: 'astro' },
                ]}
                onValueChange={() => {}}
                placeholder="Select frameworks…"
              />
            </div>
          </SubSection>
          <SubSection title="With Default Values & Max Count">
            <div className="w-full max-w-sm">
              <MultiSelect
                options={[
                  { label: 'JavaScript', value: 'js' },
                  { label: 'TypeScript', value: 'ts' },
                  { label: 'Python', value: 'python' },
                  { label: 'Rust', value: 'rust' },
                  { label: 'Go', value: 'go' },
                  { label: 'Java', value: 'java' },
                ]}
                defaultValue={['js', 'ts', 'python', 'rust']}
                onValueChange={() => {}}
                placeholder="Select languages…"
                maxCount={2}
              />
            </div>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 25. POPOVER + COMMAND + DIALOG ========== */}
        <Section title="Popover / Command / Dialog" number={25}>
          <SubSection title="(Used internally)">
            <Card className="w-full max-w-md">
              <CardContent className="pt-0">
                <p className="text-muted-foreground text-sm">
                  Popover, Command (cmdk), and Dialog were installed as dependencies
                  for the MultiSelect component. They are also available for direct use
                  in your own components.
                </p>
              </CardContent>
            </Card>
          </SubSection>
        </Section>

        <Separator />

        {/* ========== 26. SIDEBAR ========== */}
        <Section title="Sidebar" number={26}>
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
      <Toaster position="top-center" />
    </TooltipProvider>
  );
}
