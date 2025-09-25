import picture from '../img/robot.png'

const Header = () => {
  return (
    <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <img src={picture} />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            Robogram
          </h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button className="p-2 rounded-full hover:bg-slate-700 transition-colors">
            <i className="fas fa-cog text-slate-300"></i>
          </button>
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold cursor-pointer">
              U
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;