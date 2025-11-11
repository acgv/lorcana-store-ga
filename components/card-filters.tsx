"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/components/language-provider"
import { Grid, List } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CardFiltersProps {
  filters: {
    type: string
    set: string
    rarity: string
    minPrice: number
    maxPrice: number
    version: string
    search: string
  }
  setFilters: (filters: any) => void
  sortBy: string
  setSortBy: (sort: string) => void
  viewMode: "grid" | "list"
  setViewMode: (mode: "grid" | "list") => void
}

export function CardFilters({ filters, setFilters, sortBy, setSortBy, viewMode, setViewMode }: CardFiltersProps) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6 p-6 rounded-lg bg-card/50 backdrop-blur-sm border border-primary/20 shadow-lg shadow-primary/5">
      <div>
        <h3 className="font-sans text-2xl font-bold mb-6 tracking-tight bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
          {t("filters")}
        </h3>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("search")}</Label>
        <Input
          placeholder={t("search")}
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          className="bg-background/50 border-primary/30 focus:border-primary/60 transition-colors"
        />
      </div>

      {/* Type */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("type")}</Label>
        <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
          <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue placeholder={t("type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="character">{t("character")}</SelectItem>
            <SelectItem value="item">{t("item")}</SelectItem>
            <SelectItem value="action">{t("action")}</SelectItem>
            <SelectItem value="song">{t("song")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Set */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("set")}</Label>
        <Select value={filters.set} onValueChange={(value) => setFilters({ ...filters, set: value })}>
          <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue placeholder={t("set")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allSets")}</SelectItem>
            <SelectItem value="firstChapter">{t("firstChapter")}</SelectItem>
            <SelectItem value="riseOfFloodborn">{t("riseOfFloodborn")}</SelectItem>
            <SelectItem value="intoInklands">{t("intoInklands")}</SelectItem>
            <SelectItem value="ursulaReturn">{t("ursulaReturn")}</SelectItem>
            <SelectItem value="shimmering">{t("shimmering")}</SelectItem>
            <SelectItem value="azurite">{t("azurite")}</SelectItem>
            <SelectItem value="archazia">Set 7 - Archazia's Island</SelectItem>
            <SelectItem value="reignOfJafar">Set 8 - Reign of Jafar</SelectItem>
            <SelectItem value="fabled">Set 9 - Fabled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Rarity */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("rarity")}</Label>
        <Select value={filters.rarity} onValueChange={(value) => setFilters({ ...filters, rarity: value })}>
          <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue placeholder={t("rarity")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all")}</SelectItem>
            <SelectItem value="common">{t("common")}</SelectItem>
            <SelectItem value="uncommon">{t("uncommon")}</SelectItem>
            <SelectItem value="rare">{t("rare")}</SelectItem>
            <SelectItem value="superRare">{t("superRare")}</SelectItem>
            <SelectItem value="legendary">{t("legendary")}</SelectItem>
            <SelectItem value="enchanted">{t("enchanted")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Version/Stock */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("versionAvailability")}</Label>
        <Select value={filters.version} onValueChange={(value) => setFilters({ ...filters, version: value })}>
          <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue placeholder={t("allVersions")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allVersions")}</SelectItem>
            <SelectItem value="normal">{t("normalOnly")}</SelectItem>
            <SelectItem value="foil">{t("foilOnly")}</SelectItem>
            <SelectItem value="both">{t("bothAvailable")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-3 pb-2">
        <Label className="text-sm font-semibold text-foreground/90">{t("priceRange")}</Label>
        <div className="pt-3">
          <Slider
            min={0}
            max={100000}
            step={500}
            value={[filters.minPrice, filters.maxPrice]}
            onValueChange={([min, max]) => setFilters({ ...filters, minPrice: min, maxPrice: max })}
            className="cursor-pointer"
          />
          <div className="flex justify-between mt-3 text-sm font-medium text-foreground/70">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">${Math.floor(filters.minPrice).toLocaleString()}</span>
            <span className="px-2 py-1 rounded bg-primary/10 text-primary">${Math.floor(filters.maxPrice).toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent my-2" />

      {/* Sort */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("sortBy")}</Label>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="bg-background/50 border-primary/30 hover:border-primary/50 transition-colors">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nameAZ">{t("nameAZ")}</SelectItem>
            <SelectItem value="nameZA">{t("nameZA")}</SelectItem>
            <SelectItem value="priceLowHigh">{t("priceLowHigh")}</SelectItem>
            <SelectItem value="priceHighLow">{t("priceHighLow")}</SelectItem>
            <SelectItem value="raritySort">{t("raritySort")}</SelectItem>
            <SelectItem value="cardNumberLowHigh">{t("cardNumberLowHigh")}</SelectItem>
            <SelectItem value="cardNumberHighLow">{t("cardNumberHighLow")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* View Mode */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-foreground/90">{t("viewLabel")}</Label>
        <div className="flex flex-col gap-2">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="transition-all justify-start w-full"
          >
            <Grid className="h-4 w-4 mr-2" />
            {t("gridView")}
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="transition-all justify-start w-full"
          >
            <List className="h-4 w-4 mr-2" />
            {t("listView")}
          </Button>
        </div>
      </div>
    </div>
  )
}
