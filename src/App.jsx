import React, { lazy, useState } from "react"


const Calendar = lazy(() => import("./components/calander/Calander"));

function App() {


        return (
               <div className="app">
                     <Calendar />
                </div>
        )
}

export default App
