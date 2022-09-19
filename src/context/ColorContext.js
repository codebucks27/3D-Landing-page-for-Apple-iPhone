import { useState } from "react";
import { createContext } from "react";
import { useGLTF } from '@react-three/drei';



export const ColorContext = createContext({});


export const ColorContextProvider = ({children}) => {
    const { materials } = useGLTF("/scene.gltf");
    const [currentColor, serCurrentColor] = useState({
        color:"#9BB5CE",
        text:"Sierra Blue",
        rgbColor:"155, 181, 206",
    })

    let changeColorContext = (colorObj) => {

        materials.Body.color.set(colorObj.color);
        serCurrentColor(colorObj)
      }

    return(
        <ColorContext.Provider value={{currentColor, changeColorContext}}>
            {children}
        </ColorContext.Provider>
    )

}