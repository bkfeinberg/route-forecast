import React, {Suspense, useState} from "react"
import  {useMediaQuery} from 'react-responsive'
import Cookies from "universal-cookie";
const FaqDrawer = React.lazy(() => import("./FaqImpl").then(module => ({ default: module.FaqDrawer })));

const FaqImage = ({flash} : {flash:boolean}) => {    
    const textClass = flash ? "flashing-red-text" : ""
    const width = 50;
    const height = 30;
    const viewBox = `0 0 ${width} ${height}`
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox}>
            <text fill="none"  strokeWidth={1} paintOrder="stroke" y={20} stroke="#0066ff"
             fontFamily="sans-serif" fontSize={18} fontWeight="bold" className={textClass}>FAQ</text>
        </svg>
    )
}

const FaqButton = () => {
    const [faqVisible, setFaqVisible] = useState(false)
    const cookies = new Cookies(null, { path: '/' });
    const showFaq = () => {
        cookies.set('clickedFaq', "true", { path: '/' }); 
        setFaqVisible(true)
    }

    const hideFaq = () => {
        setFaqVisible(false)
    }
    const faqWasClicked = cookies.get('clickedFaq') === "true"
    const isMobile = useMediaQuery({query:'(max-width: 600px)'})
    const drawerSize = isMobile? "sm" : "xl"

    return (
        <>
            <button style={{border:'none', backgroundColor: 'transparent', width:"90px", height:"60px"}} onClick={showFaq}>
                <FaqImage flash={!faqWasClicked}/>
            </button>
            <Suspense fallback={<div>Loading FAQ drawer...</div>}><FaqDrawer drawerSize={drawerSize} hideFaq={hideFaq} faqVisible={faqVisible}/></Suspense>
        </>
    )
}

export default React.memo(FaqButton)