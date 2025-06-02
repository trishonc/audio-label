import { ModeToggle } from "./ModeToggle"

export function Header() {
  return (
    <header className="w-full border-b">
      <div className="w-full flex h-14 items-center px-4">
        <h1 className="text-lg font-semibold">Label Audio</h1>
        <div className="ml-auto">
          <ModeToggle />
        </div>
      </div>
    </header>
  )
} 