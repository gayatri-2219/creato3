import creatoLogo from '../../assets/creato-logo.png'

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img alt="Creato3 logo" className="h-11 w-auto object-contain" src={creatoLogo} />
      <span className="text-xl font-semibold text-[#1f2937] dark:text-white">Creato3</span>
    </div>
  )
}
