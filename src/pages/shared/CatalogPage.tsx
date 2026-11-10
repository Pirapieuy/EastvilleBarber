import { useState } from "react"
import { ServicesPage } from "./ServicesPage"
import { ProductsPage } from "./ProductsPage"
import { PromoDiscountsTab } from "./PromoDiscountsTab"
import { Button } from "../../components/common/UI"
import { Icon } from "../../components/common/Icon"

export function CatalogPage({ initialTab = "layanan" }: {
  initialTab?: "layanan" | "produk" | "diskon"
} = {}) {
  const [activeTab, setActiveTab] = useState<"layanan" | "produk" | "diskon">(
    initialTab,
  )

  return (
    <div className="content catalog-page">
      <div className="catalog-tab-header">
        <div className="segmented catalog-segmented">
          <Button
            className={activeTab === "layanan" ? "active" : ""}
            onClick={() => setActiveTab("layanan")}
          >
            <Icon name="cashier" /> Layanan
          </Button>
          <Button
            className={activeTab === "produk" ? "active" : ""}
            onClick={() => setActiveTab("produk")}
          >
            <Icon name="product" /> Produk
          </Button>
          <Button
            className={activeTab === "diskon" ? "active" : ""}
            onClick={() => setActiveTab("diskon")}
          >
            <Icon name="cash" /> Diskon Event
          </Button>
        </div>
      </div>

      {activeTab === "layanan" && <ServicesPage embedded />}
      {activeTab === "produk" && <ProductsPage embedded />}
      {activeTab === "diskon" && <PromoDiscountsTab />}
    </div>
  )
}

export default CatalogPage
