export interface Card {
  id: string
  name: string
  image: string
  set: string
  rarity: string
  type: string
  number: number
  price: number
  foilPrice: number
  description: string
  cardNumber?: string
  version?: string
  language?: string
  status?: string
  normalStock?: number  // Stock for normal version
  foilStock?: number    // Stock for foil version
  createdAt?: string
  updatedAt?: string
}

// Import real Lorcana cards if available, otherwise use defaults
let importedCards: Card[] = []
try {
  importedCards = require('./imported-cards.json')
} catch (e) {
  // File doesn't exist yet, use default cards below
}

const defaultCards: Card[] = [
  {
    id: "1",
    name: "Elsa - Snow Queen",
    image: "/elsa-snow-queen-lorcana-card-with-ice-magic.jpg",
    set: "firstChapter",
    rarity: "legendary",
    type: "character",
    number: 1,
    price: 45.99,
    foilPrice: 89.99,
    description: "A powerful character with ice abilities",
    normalStock: 3,
    foilStock: 1,
  },
  {
    id: "2",
    name: "Mickey Mouse - Brave Little Tailor",
    image: "/mickey-mouse-brave-little-tailor-lorcana-card.jpg",
    set: "firstChapter",
    rarity: "superRare",
    type: "character",
    number: 2,
    price: 12.99,
    foilPrice: 24.99,
    description: "A heroic version of Mickey Mouse",
    normalStock: 15,
    foilStock: 8,
  },
  {
    id: "3",
    name: "Maleficent - Monstrous Dragon",
    image: "/maleficent-dragon-form-lorcana-card-dark-magic.jpg",
    set: "riseOfFloodborn",
    rarity: "legendary",
    type: "character",
    number: 3,
    price: 52.99,
    foilPrice: 99.99,
    description: "Transform into a fearsome dragon",
    normalStock: 2,
    foilStock: 0,
  },
  {
    id: "4",
    name: "Tinker Bell - Giant Fairy",
    image: "/tinker-bell-giant-fairy-lorcana-card-glowing.jpg",
    set: "riseOfFloodborn",
    rarity: "rare",
    type: "character",
    number: 4,
    price: 8.99,
    foilPrice: 16.99,
    description: "A larger-than-life fairy with magical powers",
  },
  {
    id: "5",
    name: "Aladdin - Heroic Outlaw",
    image: "/aladdin-heroic-outlaw-lorcana-card-magic-lamp.jpg",
    set: "intoInklands",
    rarity: "superRare",
    type: "character",
    number: 5,
    price: 14.99,
    foilPrice: 28.99,
    description: "A daring hero ready for adventure",
  },
  {
    id: "6",
    name: "Ursula - Power Hungry",
    image: "/ursula-sea-witch-lorcana-card-tentacles-magic.jpg",
    set: "ursulaReturn",
    rarity: "legendary",
    type: "character",
    number: 6,
    price: 48.99,
    foilPrice: 94.99,
    description: "The sea witch seeks ultimate power",
  },
  {
    id: "7",
    name: "Simba - Returned King",
    image: "/simba-lion-king-lorcana-card-pride-rock.jpg",
    set: "shimmering",
    rarity: "rare",
    type: "character",
    number: 7,
    price: 9.99,
    foilPrice: 18.99,
    description: "The rightful king returns to Pride Rock",
  },
  {
    id: "8",
    name: "Moana - Of Motunui",
    image: "/moana-ocean-voyager-lorcana-card-sailing.jpg",
    set: "azurite",
    rarity: "superRare",
    type: "character",
    number: 8,
    price: 13.99,
    foilPrice: 26.99,
    description: "A brave voyager exploring the seas",
  },
  {
    id: "9",
    name: "Magic Broom",
    image: "/magic-broom-lorcana-card-fantasia-animated.jpg",
    set: "firstChapter",
    rarity: "common",
    type: "item",
    number: 9,
    price: 2.99,
    foilPrice: 5.99,
    description: "An enchanted broom that never stops",
  },
  {
    id: "10",
    name: "Hakuna Matata",
    image: "/hakuna-matata-song-lorcana-card-lion-king.jpg",
    set: "firstChapter",
    rarity: "uncommon",
    type: "song",
    number: 10,
    price: 4.99,
    foilPrice: 9.99,
    description: "No worries for the rest of your days",
  },
  {
    id: "11",
    name: "Be Prepared",
    image: "/be-prepared-villain-song-lorcana-card-dark.jpg",
    set: "riseOfFloodborn",
    rarity: "rare",
    type: "song",
    number: 11,
    price: 7.99,
    foilPrice: 14.99,
    description: "A villainous anthem of preparation",
  },
  {
    id: "12",
    name: "Freeze",
    image: "/freeze-ice-magic-action-lorcana-card-blue.jpg",
    set: "firstChapter",
    rarity: "common",
    type: "action",
    number: 12,
    price: 1.99,
    foilPrice: 3.99,
    description: "Freeze your opponents in their tracks",
  },
]

// Export imported cards if available, otherwise use default cards
export const mockCards: Card[] = importedCards.length > 0 ? importedCards : defaultCards
