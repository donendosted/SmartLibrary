"use client";
import { useState } from "react";
export function Search({placeholder="Search…",onChange}:{placeholder?:string;onChange?:(value:string)=>void}){const [value,setValue]=useState("");return <input aria-label={placeholder} placeholder={placeholder} value={value} onChange={e=>{setValue(e.target.value);onChange?.(e.target.value)}} style={{border:"1px solid var(--border)",borderRadius:6,padding:"9px 11px",minWidth:220}}/>}
export function Status({value}:{value:string}){const kind=/available|active|completed|paid|ready/i.test(value)?"success":/overdue|lost|suspended/i.test(value)?"danger":"warning";return <span className={`badge ${kind}`}>{value}</span>}
