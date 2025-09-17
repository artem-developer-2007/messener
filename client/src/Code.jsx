import './App.css';
import { useState } from 'react'
import { useRef } from 'react'

function Code() {
  // Создаем рефы для каждого инпута
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);
  const inputRef3 = useRef(null);
  const inputRef4 = useRef(null);
  const inputRef5 = useRef(null);
  const inputRef6 = useRef(null);

  // Состояния для значений инпутов (если они нужны вам для других целей)
  const [code1, setCode1] = useState('');
  const [code2, setCode2] = useState('');
  const [code3, setCode3] = useState('');
  const [code4, setCode4] = useState('');
  const [code5, setCode5] = useState('');
  const [code6, setCode6] = useState('');

  // Обработчик, который будет переключать фокус
  const handleChange = (e, currentRef, nextRef) => {
    const value = e.target.value;

    // Обновляем состояние соответствующего инпута
    // Здесь это условно, вам нужно понять, какому состоянию соответствует какой инпут
    if (currentRef === inputRef1) setCode1(value);
    if (currentRef === inputRef2) setCode2(value);
    if (currentRef === inputRef3) setCode3(value);
    if (currentRef === inputRef4) setCode4(value);
    if (currentRef === inputRef5) setCode5(value);
    if (currentRef === inputRef6) setCode6(value);

    // Если пользователь что-то ввел и следующий реф существует,
    // то переключаем фокус на следующий инпут
    if (value && nextRef && nextRef.current) {
      nextRef.current.focus();
    }
  };

    return (
        <>
        <div className='bg-neutral-900 h-screen'>
          <div className='flex flex-col items-center justify-center pt-72'>
            <p className='text-amber-50 flex justify-center items-center'>HELLO hello 123</p>
          </div>
          <div className='bg-neutral-900 flex flex-row items-center justify-center gap-5 pt-20
          '>
                
                <input
                type="text"
                maxLength={1}
                value={code1}
                ref={inputRef1}
                onChange={(e) => handleChange(e, inputRef1, inputRef2)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code2}
                ref={inputRef2}
                onChange={(e) => handleChange(e, inputRef2, inputRef3)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code3}
                ref={inputRef3}
                onChange={(e) => handleChange(e, inputRef3, inputRef4)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code4}
                ref={inputRef4}
                onChange={(e) => handleChange(e, inputRef4, inputRef5)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code5}
                ref={inputRef5}
                onChange={(e) => handleChange(e, inputRef5, inputRef6)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
                <input
                type="text"
                maxLength={1}
                value={code6}
                ref={inputRef6}
                onChange={(e) => handleChange(e, inputRef6)}
                className="w-20 h-20 border text-white border-gray-300 rounded-lg text-center text-3xl"
                />
            </div>
        </div>
        </>
    )
}


export default Code;