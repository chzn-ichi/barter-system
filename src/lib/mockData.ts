export const categories = [
  "All",
  "Fashion",
  "Electronics",
  "Books",
  "Home & Kitchen",
  "Furniture",
  "Sports & Outdoors",
  "Hobbies",
  "Toys & Games",
  "School Supplies",
  "Appliances",
  "Beauty",
  "Other",
];

export const barangays = [
  "Macasandig",
  "Carmen",
  "Lapasan",
  "Kauswagan",
  "Bulua",
  "Nazareth",
  "Gusa",
  "Patag",
  "Balulang",
  "Cugman",
];

export type Listing = {
  id: string;
  title: string;
  category: string;
  condition: "Brand New" | "Like New" | "Good" | "Fair";
  wantsInExchange: string;
  distanceKm: number;
  imageUrl: string;
  ownerName: string;
  isMine?: boolean;
};

export const listings: Listing[] = [
  {
    id: "l1",
    title: "Fujifilm Instax Mini Camera",
    category: "Electronics",
    condition: "Like New",
    wantsInExchange: "Film camera or wireless headphones",
    distanceKm: 1.8,
    imageUrl: "https://picsum.photos/seed/camera1/400/400",
    ownerName: "Mika R.",
  },
  {
    id: "l2",
    title: "Vintage Leather Jacket (M)",
    category: "Fashion",
    condition: "Good",
    wantsInExchange: "Sneakers, size 9",
    distanceKm: 3.2,
    imageUrl: "https://picsum.photos/seed/jacket1/400/400",
    ownerName: "Carlo T.",
  },
  {
    id: "l3",
    title: "Psychology 101 Textbook Set",
    category: "Books",
    condition: "Good",
    wantsInExchange: "Any fiction novels",
    distanceKm: 0.9,
    imageUrl: "https://picsum.photos/seed/books1/400/400",
    ownerName: "Anna L.",
  },
  {
    id: "l4",
    title: "Non-stick Cookware Set",
    category: "Home & Kitchen",
    condition: "Brand New",
    wantsInExchange: "Small kitchen appliances",
    distanceKm: 2.4,
    imageUrl: "https://picsum.photos/seed/cookware1/400/400",
    ownerName: "Grace P.",
  },
  {
    id: "l5",
    title: "Acoustic Guitar",
    category: "Hobbies",
    condition: "Fair",
    wantsInExchange: "Keyboard or ukulele",
    distanceKm: 4.6,
    imageUrl: "https://picsum.photos/seed/guitar1/400/400",
    ownerName: "Joshua M.",
  },
  {
    id: "l6",
    title: "Wooden Study Desk",
    category: "Furniture",
    condition: "Good",
    wantsInExchange: "Office chair",
    distanceKm: 5.1,
    imageUrl: "https://picsum.photos/seed/desk1/400/400",
    ownerName: "Bea S.",
  },
  {
    id: "l7",
    title: "Basketball + Pump",
    category: "Sports & Outdoors",
    condition: "Like New",
    wantsInExchange: "Badminton racket",
    distanceKm: 1.2,
    imageUrl: "https://picsum.photos/seed/ball1/400/400",
    ownerName: "Miguel A.",
  },
  {
    id: "l8",
    title: "Board Game Bundle (3 titles)",
    category: "Toys & Games",
    condition: "Good",
    wantsInExchange: "Puzzle sets or card games",
    distanceKm: 2.9,
    imageUrl: "https://picsum.photos/seed/games1/400/400",
    ownerName: "Trisha D.",
  },
];

export const myListings: Listing[] = [
  {
    id: "m1",
    title: "Old Film Camera (working)",
    category: "Electronics",
    condition: "Fair",
    wantsInExchange: "Digital camera or lens",
    distanceKm: 0,
    imageUrl: "https://picsum.photos/seed/mycamera/400/400",
    ownerName: "You",
    isMine: true,
  },
];

export const wantedItems = ["Film Camera", "Wireless Headphones", "Psychology Books"];

export type TradeStatus = "Pending" | "Accepted" | "Completed" | "Cancelled";

export type Trade = {
  id: string;
  withUser: string;
  offeredItem: string;
  wantedItem: string;
  status: TradeStatus;
  updatedAt: string;
};

export const trades: Trade[] = [
  {
    id: "t1",
    withUser: "Mika R.",
    offeredItem: "Old Film Camera",
    wantedItem: "Fujifilm Instax Mini Camera",
    status: "Pending",
    updatedAt: "2 hours ago",
  },
  {
    id: "t2",
    withUser: "Carlo T.",
    offeredItem: "Board Game Bundle",
    wantedItem: "Vintage Leather Jacket",
    status: "Accepted",
    updatedAt: "Yesterday",
  },
  {
    id: "t3",
    withUser: "Anna L.",
    offeredItem: "Basketball + Pump",
    wantedItem: "Psychology 101 Textbook Set",
    status: "Completed",
    updatedAt: "Sept 12",
  },
];