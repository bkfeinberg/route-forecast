// src/utils/test-utils.js
import React from 'react';
import { render as testingLibraryRender } from '@testing-library/react';
// Import any providers you need, e.g., a Redux Provider
import { MantineProvider, createTheme, Button } from '@mantine/core';
import classes from "../static/mantine.module.css";
import configureReduxStore from '../redux/configureStore';
import { Provider } from 'react-redux';

const theme = createTheme({
  components: {
    Button: Button.extend({ classNames: classes }),
  }
});

export function renderWithProviders(
    ui: React.ReactNode,
    {
        preloadedState = {},
        store = configureReduxStore({ _preloadedState: preloadedState, mode: "production" }),
        ...renderOptions
    } = {}
) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return <MantineProvider theme={theme} env="test"><Provider store={store}>{children}</Provider></MantineProvider>;
    }

    // Return an object with the store object as well
    return { store, ...testingLibraryRender(ui, { wrapper: Wrapper, ...renderOptions }) };
}

const customRender = (ui: React.ReactElement) =>
  {
    return testingLibraryRender(<>{ui}</>, {
      wrapper: ({ children }: { children: React.ReactNode }) => {
        return (
        <MantineProvider theme={theme} env="test">
          {children}
        </MantineProvider>
    )},
  })
}

// Re-export everything from the library
export * from '@testing-library/react';

// Override the original render with your custom one
export { customRender as render };
