import { useState } from "react";
import { Zap, Search } from "lucide-react";
import { Navbar } from "@/components/navigation/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ListCard } from "@/components/lists/ListCard";
import { CreateListModal } from "@/components/lists/CreateListModal";
import { useChayan } from "@/lib/chayan-context";

export function HomePage() {
  const { lists } = useChayan();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLists = lists.filter((l) =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex flex-col">
        {/* Primary CTA Section */}
        <section className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-4 sm:pt-10 sm:pb-6 max-w-4xl mx-auto w-full text-center">
          {/* Primary CTA */}
          <div className="flex justify-center">
            <Button variant="cyber" size="xl" onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
              <Zap />
              Create a List
            </Button>
          </div>
        </section>

        {/* Lists Section */}
        <section className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-6xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white tracking-tight">Lists</h2>
              <Badge variant="outline" className="border-cyan-500/30 bg-cyan-500/10 font-mono text-cyan-300">
                {lists.length}
              </Badge>
            </div>

            {lists.length > 3 && (
              <InputGroup className="max-w-xs rounded-xl bg-slate-950/70">
                <InputGroupAddon>
                  <Search />
                </InputGroupAddon>
                <InputGroupInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter lists..."
                  aria-label="Filter lists"
                  className="font-mono text-xs"
                />
              </InputGroup>
            )}
          </div>

          {filteredLists.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLists.map((list) => (
                <ListCard key={list._id} list={list} />
              ))}
            </div>
          ) : lists.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm font-mono">
              No lists created yet. Click &ldquo;Create a List&rdquo; above to begin.
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-sm font-mono">
              No lists match &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </section>
      </main>

      <CreateListModal open={showCreateModal} onOpenChange={setShowCreateModal} />
    </div>
  );
}
