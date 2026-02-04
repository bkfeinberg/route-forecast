import { useEffect, useState } from 'react';
import ReactGA from "react-ga4";
import { useMediaQuery } from "react-responsive";
import { DesktopTooltip } from "../shared/DesktopTooltip"
import { useTranslation } from 'react-i18next'
import { i18n } from "i18next";
import { Button } from '@mantine/core';
import Cookies from 'universal-cookie';

const english_donation_image = 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif'
const french_donation_image = 'https://www.paypalobjects.com/fr_XC/i/btn/btn_donate_LG.gif'
const spanish_donation_image = 'https://www.paypalobjects.com/es_XC/i/btn/btn_donate_LG.gif'

const donationImage = (i18next: i18n) => {
    if (i18next.resolvedLanguage) {
        if (i18next.resolvedLanguage.startsWith('fr')) {
            return french_donation_image
        } else if (i18next.resolvedLanguage.startsWith('es')) {
            return spanish_donation_image
        }
    }
    return english_donation_image
}

declare module 'react' {
    interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
        // extends React's HTMLAttributes
        border?: string;
    }
}

const DonationRequest = ({ wacky }: { wacky: boolean }) => {
    const [
        transform,
        setTransform
    ] = useState<string>("")
    const [
        filter,
        setFilter
    ] = useState<string>("")
    const cookies = new Cookies(null, { path: '/' });

    const donateWasClicked = cookies.get('clickedDonate') === "true"
    const buttonImageWidth = useMediaQuery({ query: '(min-width: 1300px)' }) ? '106px' : '80px'
    useEffect(() => {
        if (wacky && !donateWasClicked) {
            const interval = setInterval(() => {
                setTransform(`rotate3d(${Math.random()}, ${Math.random()}, ${Math.random()}, ${Math.random() * 90 - 45}deg)`)
                setFilter(`hue-rotate(${Math.random() * 360}deg)`)
            }, 1500)
            return () => {
                clearInterval(interval)
            }
        }
    }, [wacky])

    const { t, i18n } = useTranslation()

    return (
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <div style={{ transform: transform, transition: "transform 1.5s, filter 1.5s linear", filter: filter, zIndex: 1 }}>
            <DesktopTooltip label={'Hi, if you would like to support randoplan, please consider donating'} position='left'>
                <Button variant='default' component={'a'} id={'donate'} href="https://paypal.me/BFeinberg" target="_blank"
                    onClick={() => { cookies.set('clickedDonate', "true", { path: '/' }); ReactGA.event('purchase', { currency: 'dollars' }) }}>
                    <img alt="" border="0" src={donationImage(i18n)} width={buttonImageWidth} /* height="30" */ />
                </Button>
            </DesktopTooltip>
        </div>
    );
}

export default DonationRequest;

