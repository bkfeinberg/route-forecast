
import { useAppDispatch, useAppSelector } from "../../utils/hooks";
import { bankedDisplayToggled, controlAdded } from "../../redux/controlsSlice";
import * as Sentry from "@sentry/react"
import { ToggleButton } from '../shared/ToggleButton';
import { ControlTable } from './ControlTable';
import { DesktopTooltip } from "../shared/DesktopTooltip";
import {useTranslation} from 'react-i18next'
import { Button, Paper } from "@mantine/core";

import { IconPlus } from "@tabler/icons-react"

export const ControlTableContainer = ({ref} : {ref?: React.RefObject<HTMLDivElement | null>}) => {
  const displayBanked = useAppSelector(state => state.controls.displayBanked)
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
//style={{ margin: '6px', display: "flex", flexFlow: "column", alignItems: "center" }}
  return (
    <>
      <Sentry.ErrorBoundary fallback={<h2>Something went wrong.</h2>}>
        <Paper ref={ref} withBorder shadow={"sm"} radius={3} style={{ margin: '16px', display: "flex", flexFlow: "column", alignItems: "center" }}>
            <Sentry.ErrorBoundary fallback={<h2>Something else went wrong.</h2>}>
              <ControlTable />
              <AddRowButton/>
              <DesktopTooltip withinPortal={true} position='bottom' label={t('tooltips.banked')}>
                  <ToggleButton style={{marginTop: "10px"}} active={displayBanked} onClick={() => dispatch(bankedDisplayToggled())}>{t("buttons.banked")}</ToggleButton>
              </DesktopTooltip>
            </Sentry.ErrorBoundary>
        </Paper>
      </Sentry.ErrorBoundary>
      <div tabIndex={98} onFocus={() => {
        let button = document.getElementById('addButton');
        if (button !== undefined && button !== null) {
          button.focus();
        }
      }} />
    </>
  )
}

const AddRowButton = () => {
  const dispatch = useAppDispatch()
  const { t } = useTranslation()
  return (
    <div style={{border: "1px solid black", width: "100%"}} onClick={() => dispatch(controlAdded())}>
      <Button id={'addButton'} style={{width: "100%"}} variant='default' tabIndex={0} leftSection={<IconPlus/>}>{t("buttons.addControl")}</Button>
    </div>
  )
}