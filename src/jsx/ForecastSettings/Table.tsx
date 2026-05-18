import React, { Ref, useState } from 'react';

interface Column {
  name:string
  editable?: boolean
  cellStyle?: React.JSX.Element | {}
  valueTransformFunction?: (value: string) => string
  editValidateFunction?: (value: string) => boolean
  editTransformFunction?: (value: string) => string
  editCompleteFunction?: (value: string) => string
  headerStyle?: React.JSX.Element | {}
  render?: React.JSX.Element | string
}

const pickTabIndex = (column: Column) => {
  if (!column.editable) return -1
  return 0
};

interface RowType {
  [index:string]:any
}

const shouldAutoFocus = (row: RowType, column:Column) => {
  return (column.name==='name' && row[column.name] === '');
}

interface TableProps {
  data: {
    columns: Array<Column>
    rows: Array<RowType>  
  }
  onCellValueChanged: (index:number, name: string, value: string|number) => void
}

export const Table = ({data, onCellValueChanged} : TableProps) => {
  let {columns, rows} = data
  columns = columns.map((column:Column) => ({...column, valueTransformFunction: column.valueTransformFunction || (value => value)}))

  const baseStyle = {
    border: "1px solid black",
    padding: "3px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center" as const,
  }
  const headerStyle = {...baseStyle, fontWeight: "bold" as const}

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
      gridAutoRows: "minmax(20px, auto)",
      fontSize: "12px"
    }}>
      {columns.map(({render: columnTitle, name, headerStyle: customHeaderStyle} : Column, index:number) =>
        <div key={name} style={{...headerStyle, ...customHeaderStyle, gridColumn: index + 1, gridRow: 1}}>
          <div>
            {columnTitle}
          </div>
        </div>
      )}
      {rows.map((row: RowType, rowIndex : number) =>
        <React.Fragment key={rowIndex}>
          {columns.map((column:Column, columnIndex:number) =>
            <div key={column.name} style={{...baseStyle, ...column.cellStyle, ...row["style"], gridColumn: columnIndex + 1, gridRow: rowIndex + 2}}>
              <Cell
                value={row[column.name]}
                transformFunction={column.valueTransformFunction!}
                editable={column.editable===true}
                tabIndex={pickTabIndex(column)}
                autoFocus={shouldAutoFocus(row, column)}
                onCellValueChanged={(value) => onCellValueChanged(rowIndex, column.name, value)}
                editValidateFunction={column.editValidateFunction}
                editTransformFunction={column.editTransformFunction ? column.editTransformFunction : value => value}
                editCompleteFunction={column.editCompleteFunction ? column.editCompleteFunction : value => value}
              />
            </div>
          )}
        </React.Fragment>

      )}
    </div>
  )
}

interface CellProps {
  value: string
  transformFunction: (value: string) => string
  editTransformFunction: (value: string) => string
  editCompleteFunction: (value: string) => string
  editable: boolean
  tabIndex: number
  autoFocus: boolean
  onCellValueChanged: (value: number|string) => void
  editValidateFunction?: (value: string) => boolean
}
const Cell = ({ value, transformFunction, editTransformFunction, editCompleteFunction, editable, tabIndex, autoFocus, onCellValueChanged, editValidateFunction } : CellProps) => {
  const [
    editingValue,
    setEditingValue
  ] = useState<string | null>(null)
  const beginEditing = () => {
    if (editable) {
      setEditingValue(editTransformFunction(value))
    }
  }

  const endEditing = () => {
    onCellValueChanged(editCompleteFunction((editingValue && editingValue !== '') ? editingValue : '-----'))
    setEditingValue(null)
  }

  const valueEdited = (value: string) => {
    if (editValidateFunction === undefined || editValidateFunction(value)) {
      setEditingValue(value)
    }
  }

  return (
    editingValue !== null ?
      <div>
        <input autoFocus value={editingValue} style={{ width: "40px" }} onFocus={(event) => event.target.select()} onChange={(event) => valueEdited(event.target.value)} onBlur={endEditing} />
      </div> :
      <div autoFocus={autoFocus} ref={field => {field && autoFocus && field.focus()}} style={{ cursor: editable ? "pointer" : "", width: "100%", height: "100%" }} tabIndex={tabIndex} onClick={beginEditing} onFocus={beginEditing}>
        {value !== undefined && transformFunction(value)}
      </div>
  )
}
