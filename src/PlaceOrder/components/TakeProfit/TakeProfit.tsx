/* eslint @typescript-eslint/no-use-before-define: 0 */


import React, { useState, useEffect } from "react";
import block from "bem-cn-lite";
import { AddCircle, Cancel } from "@material-ui/icons";
import _maxBy from "lodash/maxBy";
import _findIndex from "lodash/findIndex";
import _sumBy from "lodash/sumBy"

import { useStore } from "../../context";
import { Switch, TextButton, NumberInput } from "components";

import { QUOTE_CURRENCY } from "../../constants";
import { OrderSide } from "../../model";
import "./TakeProfit.scss";

type IInitialInputObject = {
  profit: number
  price: number
  sellAmount: number
}

type Props = {
  orderSide: OrderSide;
};

const b = block("take-profit");

const TakeProfit = ({ orderSide }: Props) => {
  const {
    price,
    amount
  } = useStore();

  const [switchChecked, setSwitchChecked] = useState(false);

  const initialInputObject = {
    profit: 2,
    price: price * 1.02,
    sellAmount: 100
  };

  const [targetRows, setTargetRows] = useState<IInitialInputObject[]>([initialInputObject]);

  useEffect(() => {
    if (orderSide === "buy") {
      setTargetRows(targetRows.map((item: IInitialInputObject): IInitialInputObject => {
        item.price = (price * item.profit / 100 + price)
        return item
      }))
    } else {
      setTargetRows(targetRows.map((item: IInitialInputObject): IInitialInputObject => {
        item.price = (price - price * item.profit / 100)
        return item
      }))
    }
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, orderSide])

  const setPrices = (targetRows: IInitialInputObject[]) => {
    return targetRows.map((item: IInitialInputObject): IInitialInputObject => {
      if (price === 0) return item
      item.price = orderSide === "buy"
        ? ((price * item.profit / 100) + price)
        : (price - (price * item.profit / 100))
      return item
    })
  }

  return (
    <div className={b()}>
      <div className={b("switch")}>
        <span>Take profit</span>
        <Switch checked={switchChecked} onChange={handleChange} />
      </div>
      {switchChecked && targetRows.length !== 0 ? <div className={b("content")}>
        {renderTitles()}
        {targetRows.map((item, index) => {
          return renderInputs(item, index)
        })}
        {targetRows.length < 5 ?
          <TextButton className={b("add-button")} onClick={() => {
            addTargetRow()

          }}>
            <AddCircle className={b("add-icon")} />
            <span>Add profit target {targetRows.length}/5</span>
          </TextButton>
          : ""}
        <div className={b("projected-profit")}>
          <span className={b("projected-profit-title")}>Projected profit</span>
          <span className={b("projected-profit-value")}>
            <span>{getProjectedProfit()}</span>
            <span className={b("projected-profit-currency")}>
              {QUOTE_CURRENCY}
            </span>
          </span>
        </div>
      </div> : ''}
    </div>
  );
  function handleChange(e: boolean) {
    setSwitchChecked(e)
    if (!e) {
      setTargetRows([initialInputObject])
    }
  }
  function addTargetRow() {
    setTargetRows(prevState => setSellAmount(prevState))
    setTargetRows(prevState => setPrices(prevState))
  }

  function setSellAmount(prevState: IInitialInputObject[]) {
    const sum = (_sumBy(prevState, 'sellAmount') + 20)
    const max = _maxBy(prevState, 'sellAmount');
    const index = _findIndex(prevState, max);
    const sellAmount = sum > 100
      ? prevState[index].sellAmount - (sum - 100)
      : prevState[index].sellAmount - 20
    prevState[index].sellAmount = sellAmount
    initialInputObject.profit = prevState[prevState.length - 1].profit + 2 || 2
    initialInputObject.sellAmount = 20
    return [...prevState, initialInputObject]
  }

  function removeTargetRow(index: number) {
    setTargetRows(targetRows.filter((item, i) => i !== index))
    if (targetRows.length === 1) {
      setSwitchChecked(false)
      setTargetRows([initialInputObject])
    }
  }

  function setProfit(index: number, value: number) {
    targetRows[index].profit = value;
    setTargetRows([...targetRows]);
    setPrices(targetRows)
  }

  function setPrice(index: number, value: number) {
    targetRows[index].price = value;
    if (price === 0) {
      targetRows[index].profit = 0
    } else {
      let amount = orderSide === "buy" ? (value - price) : (price - value)
      targetRows[index].profit = amount / price * 100;
    }
    setTargetRows([...targetRows]);
  }

  function setAmount(index: number, value: number) {
    targetRows[index].sellAmount = value;
    setTargetRows([...targetRows]);
  }

  function getProjectedProfit() {
    let projectedProfit = 0;
    targetRows.forEach(item => {
      let profitPerRow = orderSide === 'buy' ? (item.price - price) * item.sellAmount / 100 : (price - item.price) * item.sellAmount / 100
      projectedProfit += profitPerRow;
    })
    return (projectedProfit * amount).toFixed(2)
  }

  function renderInputs(obj: any, index: number) {
    return (
      <div className={b("inputs")} key={index}>
        <NumberInput
          value={obj.profit}
          onBlur={(e: number) => setProfit(index, e)}
          decimalScale={2}
          error={isProfitInvalid(obj, index)}
          InputProps={{ endAdornment: "%" }}
          variant="underlined"
        />
        <NumberInput
          value={obj.price}
          onBlur={(e: number) => setPrice(index, e)}
          decimalScale={2}
          error={isPriceInvalid(obj)}
          InputProps={{ endAdornment: QUOTE_CURRENCY }}
          variant="underlined"
        />
        <NumberInput
          value={obj.sellAmount}
          onBlur={(e: number) => setAmount(index, e)}
          decimalScale={2}
          error={isSellAmountInvalid()}
          InputProps={{ endAdornment: "%" }}
          variant="underlined"
        />
        <div className={b("cancel-icon")} onClick={() => removeTargetRow(index)}>
          <Cancel />
        </div>
      </div>
    );
  }

  function isProfitInvalid(item: IInitialInputObject, index: number) {
    const sum = (_sumBy(targetRows, 'profit'))
    if (item.profit < 0.01) {
      return "Minimum value is 0.01"
    } else if (index > 0 && item.profit < targetRows[index - 1].profit) {
      return "Each target's profit should be greater than the previous one"
    } else if (sum > 500) {
      return "Maximum profit sum is 500%"
    } else {
      return false
    }
  }

  function isPriceInvalid(item: IInitialInputObject) {
    if (item.price <= 0) {
      return "Price must be greater than 0"
    } else {
      return false
    }
  }

  function isSellAmountInvalid() {
    const sum = (_sumBy(targetRows, 'sellAmount'))
    if (sum > 100) {
      return `${sum} out of 100% selected. Please decrease by ${sum - 100}`
    } else {
      return false
    }
  }

  function renderTitles() {
    return (
      <div className={b("titles")}>
        <span>Profit</span>
        <span>Trade price</span>
        <span>Amount to {orderSide === "buy" ? "sell" : "buy"}</span>
      </div>
    );
  }
};

export { TakeProfit };
