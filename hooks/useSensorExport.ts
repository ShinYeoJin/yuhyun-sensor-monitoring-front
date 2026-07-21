import React from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { userApi } from '@/lib/api'

export function useSensorExport(params: {
  chartRef: React.RefObject<HTMLDivElement | null>
  sensor: any
  iconLabel: string
  chartMode: 'hourly' | 'daily'
  dateFrom: string
  dateTo: string
  sensorCode: string
  activeMeasurements: any[]
  dailyReadings: any[]
  measurementsWithGaps: any[]
  globalInitReading: any
  initValue: number
  level1Upper: number | null
  level1Lower: number | null
  remarks: Record<string, string>
}) {
  const {
    chartRef, sensor, iconLabel, chartMode, dateFrom, dateTo,
    activeMeasurements, dailyReadings, measurementsWithGaps,
    globalInitReading, initValue, level1Upper, level1Lower, remarks,
  } = params

  const handleExcelDownload = async () => {
    let chartBase64: string | null = null
    if (chartRef.current) {
      try {
        const scrollContainer = chartRef.current.querySelector('[style*="overflow"]') || chartRef.current
        const svgEl = scrollContainer.querySelector('svg') || chartRef.current.querySelector('svg')
        if (svgEl) {
          const scale = 2
          const w = Math.max((svgEl as SVGSVGElement).scrollWidth || svgEl.clientWidth, svgEl.clientWidth) * scale || 800
          const h = (svgEl.clientHeight || 200) * scale
          const svgData = new XMLSerializer().serializeToString(svgEl)
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
          const svgUrl = URL.createObjectURL(svgBlob)
          await new Promise<void>(resolve => {
            const img = new Image()
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas')
                canvas.width = w; canvas.height = h
                const ctx = canvas.getContext('2d')!
                ctx.fillStyle = '#ffffff'
                ctx.fillRect(0, 0, w, h)
                ctx.drawImage(img, 0, 0, w, h)
                const dataUrl = canvas.toDataURL('image/png')
                if (dataUrl && dataUrl.startsWith('data:image/png;base64,') && dataUrl.length > 100) {
                  chartBase64 = dataUrl
                }
              } catch { }
              URL.revokeObjectURL(svgUrl)
              resolve()
            }
            img.onerror = () => { URL.revokeObjectURL(svgUrl); resolve() }
            img.src = svgUrl
          })
        }
      } catch { chartBase64 = null }
    }
    const excelSourceRows = chartMode === 'hourly' ? activeMeasurements : dailyReadings
    const sortedRows = [...excelSourceRows].sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    const initTimestamp = globalInitReading?.timestamp ?? null
    const initDate = initTimestamp ? new Date(initTimestamp) : (sortedRows.length > 0 ? new Date(sortedRows[0].timestamp) : new Date())
    const initRowData = initTimestamp ? { timestamp: initTimestamp, value: initValue, isInitRow: true } : null
    const firstInRange = sortedRows[0]
    const initAlreadyInRows = initRowData && firstInRange && Math.abs(new Date(initRowData.timestamp).getTime() - new Date(firstInRange.timestamp).getTime()) < 60000
    const allRows = (initRowData && !initAlreadyInRows) ? [initRowData, ...sortedRows] : sortedRows
    const ExcelJSModule = await import('exceljs') as any
    const ExcelJS = ExcelJSModule.default ?? ExcelJSModule
    const wb2 = new ExcelJS.Workbook(); const ws2 = wb2.addWorksheet(iconLabel || sensor.manageNo || sensor.name || '측정데이터')
    const DARK = 'FFD9D9D9', MID = 'FFD9D9D9', WHITE = 'FFFFFFFF', BLACK = 'FF000000', RED = 'FFC00000', BLUE = 'FF2F5496', YELL = 'FFFFF2CC', ALT = 'FFEEF4FB'
    const thin = { style: 'thin' as const, color: { argb: 'FF000000' } }, med = { style: 'medium' as const, color: { argb: DARK } }
    const TB = { top: thin, left: thin, bottom: thin, right: thin }, MB = { top: med, left: med, bottom: med, right: med }
    const fill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } })
    const font = (bold = false, sz = 9, argb = BLACK) => ({ name: '맑은 고딕', size: sz, bold, color: { argb } })
    const aln  = (h: 'center'|'left'|'right' = 'center', v: 'middle'|'top'|'bottom' = 'middle', wrap = false) => ({ horizontal: h, vertical: v, wrapText: wrap })
    ws2.columns = [{ width: 22 }, { width: 8 }, { width: 16 }, { width: 14 }, { width: 16 }, { width: 18 }]
    const setH = (r: number, h: number) => { ws2.getRow(r).height = h }
    setH(1,28); setH(2,4); setH(3,18); setH(4,18)
    const CR_START = 5, CR_END = 14
    for (let r = CR_START; r <= CR_END; r++) setH(r, 18)
    setH(CR_END+1,14); setH(CR_END+2,4); setH(CR_END+3,18); setH(CR_END+4,18); setH(CR_END+5,18); setH(CR_END+6,3)
    const DS = CR_END + 7
    allRows.forEach((_: any, i: number) => setH(DS+i, 17))
    ws2.mergeCells('A1:F1')
    const t = ws2.getCell('A1'); t.value = 'Water Level Meter Report'; t.font = font(true,15,BLACK); t.fill = fill(WHITE); t.alignment = aln(); t.border = MB
    const infoRows = [
      ['현   장   명', sensor.siteName||'—', '계측기 No.', iconLabel || sensor.manageNo||'—'],
      ['설 치 현 황', sensor.installDate?`설치일자 (${sensor.installDate.slice(0,10)})`:'—', '초기측정일', initDate.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true})],
    ]
    infoRows.forEach(([l1,v1,l2,v2]: any, i: number) => {
      const r = 3+i; ws2.mergeCells(r,2,r,3); ws2.mergeCells(r,5,r,6)
      const setC = (col: number, val: string, fnt: any, fil: any, al: any) => { const c = ws2.getCell(r,col); c.value=val; c.font=fnt; c.fill=fil; c.alignment=al; c.border=TB }
      setC(1,l1,font(true,9,BLACK),fill(DARK),aln()); setC(2,v1,font(false,8,BLACK),fill(WHITE),aln('left'))
      setC(4,l2,font(true,9,BLACK),fill(DARK),aln()); setC(5,v2,font(false,8,BLACK),fill(WHITE),aln('left'))
    })
    if (chartBase64) {
      try {
        const base64Str = chartBase64 as string
        const b64data = base64Str.split(',')[1]
        if (b64data && b64data.length > 0) {
          const imgId = wb2.addImage({ base64: b64data, extension: 'png' })
          ws2.addImage(imgId, { tl: { col:0, row:CR_START-1 } as any, br: { col:6, row:CR_END } as any, editAs:'oneCell' })
        }
      } catch { }
    }
    const legendRow = CR_END+1
    ws2.mergeCells(legendRow,1,legendRow,2); const lgLine = ws2.getCell(legendRow,1)
    lgLine.value = '── '+(iconLabel || sensor.manageNo||sensor.name); lgLine.font = { name:'맑은 고딕', size:9, color:{argb:'FF2F5496'} }; lgLine.alignment = { horizontal:'center', vertical:'middle' }
    ws2.mergeCells(legendRow,3,legendRow,4); const lgLower = ws2.getCell(legendRow,3)
    lgLower.value = '- - - 1차 하한기준'; lgLower.font = { name:'맑은 고딕', size:9, color:{argb:'FFC00000'} }; lgLower.alignment = { horizontal:'center', vertical:'middle' }
    ws2.mergeCells(legendRow,5,legendRow,6); const lgUpper = ws2.getCell(legendRow,5)
    lgUpper.value = '- - - 1차 상한기준'; lgUpper.font = { name:'맑은 고딕', size:9, color:{argb:'FFE07000'} }; lgUpper.alignment = { horizontal:'center', vertical:'middle' }
    const H1=CR_END+3, H2=CR_END+4, H3=CR_END+5
    const mhdr = (r1:number,c1:number,r2:number,c2:number,val:string,sz=9,bg=DARK) => { ws2.mergeCells(r1,c1,r2,c2); const c=ws2.getCell(r1,c1); c.value=val; c.font=font(true,sz,BLACK); c.fill=fill(bg); c.alignment=aln('center','middle',true); c.border=TB }
    mhdr(H1,1,H3,1,'측  정  일'); mhdr(H1,2,H3,2,'경과일'); mhdr(H1,3,H1,5,iconLabel || sensor.manageNo||sensor.name); mhdr(H1,6,H3,6,'비  고')
    mhdr(H2,3,H2,3,`지하수위 G.L(${sensor.unit})`,8,MID); mhdr(H2,4,H2,5,'변화량(m)',8,MID)
    const setHdr = (r:number,c:number,val:string,sz=7,bg=MID) => { const cell=ws2.getCell(r,c); cell.value=val; cell.font=font(true,sz,BLACK); cell.fill=fill(bg); cell.alignment=aln('center','middle',true); cell.border=TB }
    ws2.getCell(H3,3).fill=fill(MID); ws2.getCell(H3,3).border=TB
    if(chartMode==='daily'){setHdr(H3,4,'일일 변화량');setHdr(H3,5,'누적 변화량')}
    else{setHdr(H3,4,'누적 변화량');const ec=ws2.getCell(H3,5);ec.value='';ec.font=font(true,7,BLACK);ec.fill=fill(MID);ec.alignment=aln('center','middle',true);ec.border=TB}
    allRows.forEach((row:any,i:number) => {
      const isFirst = !!(row.isInitRow) || (i===0 && !initRowData)
      const r=DS+i, rf=isFirst?YELL:(i%2===0?ALT:WHITE), base={fill:fill(rf),border:TB,alignment:aln()}
      const setD = (c:number,val:any,fnt:any,numFmt?:string) => { const cell=ws2.getCell(r,c); cell.value=val; cell.font=fnt; Object.assign(cell,base); if(numFmt) cell.numFmt=numFmt }
      const curDate=new Date(row.timestamp), curMid=new Date(curDate.getFullYear(),curDate.getMonth(),curDate.getDate()), initMid=new Date(initDate.getFullYear(),initDate.getMonth(),initDate.getDate())
      const elapsed=Math.round((curMid.getTime()-initMid.getTime())/86400000)
      const dateKey=curDate.toLocaleDateString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'})
      setD(1,curDate.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true}),font(false,9,BLACK))
      if(row.value===null){
        setD(2,'—',font(false,9,BLACK)); setD(3,'미수신',font(false,9,BLACK))
        setD(4,'—',font(false,9,BLACK)); setD(5,'—',font(false,9,BLACK))
        const cn=ws2.getCell(r,6); cn.value=''; cn.font=font(false,9,BLACK); cn.fill=fill(rf); cn.border=TB; cn.alignment=aln()
      } else {
        const curVal=parseFloat(parseFloat(String(row.value)).toFixed(4))
        const prevValid=allRows.slice(0,i).reverse().find((x:any)=>x.value!==null)
        const prevVal=prevValid?parseFloat(parseFloat(String(prevValid.value)).toFixed(4)):curVal
        const prevDiff=parseFloat((curVal-prevVal).toFixed(4)), initDiff=parseFloat((curVal-parseFloat(initValue.toFixed(4))).toFixed(4))
        const fmtDiff=(v:number)=>v>0?`▲ ${v.toFixed(4)}`:v<0?`▼ ${Math.abs(v).toFixed(4)}`:'0.0000'
        setD(2,elapsed,font(false,9,BLACK)); setD(3,curVal,font(false,9,BLACK),'0.0000')
        if(isFirst){setD(4,'0.0000',font(false,9,BLACK));setD(5,'0.0000',font(false,9,BLACK))}
        else if(chartMode==='daily'){
          setD(4,fmtDiff(prevDiff),font(false,9,prevDiff<0?BLUE:RED))
          setD(5,fmtDiff(initDiff),font(false,9,initDiff<0?BLUE:RED))
        }else{
          setD(4,fmtDiff(initDiff),font(false,9,initDiff<0?BLUE:RED))
          const ec=ws2.getCell(r,5);ec.value='';ec.font=font(false,9,BLACK);Object.assign(ec,base)
        }
        const note=remarks[dateKey]||(isFirst?'초기치':''); const cn=ws2.getCell(r,6); cn.value=note; cn.font=font(isFirst,9,isFirst?RED:BLACK); cn.fill=fill(isFirst?YELL:rf); cn.border=TB; cn.alignment=aln()
      }
    })
    ws2.pageSetup.paperSize=9; ws2.pageSetup.orientation='portrait'; ws2.pageSetup.fitToPage=true; ws2.pageSetup.fitToWidth=1; ws2.pageSetup.fitToHeight=0
    const buf=await wb2.xlsx.writeBuffer(), blob=new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), url=URL.createObjectURL(blob), a=document.createElement('a')
    a.href=url; a.download=`${iconLabel || sensor.manageNo || sensor.name}_${dateFrom}_${dateTo}.xlsx`; a.click(); URL.revokeObjectURL(url)
  }

  const handlePdfDownload = async () => {
    const doc = new jsPDF('p','mm','a4'), pageWidth = doc.internal.pageSize.getWidth()
    const fontRes=await fetch('/NanumGothic.ttf'), fontBuffer=await fontRes.arrayBuffer(), uint8=new Uint8Array(fontBuffer)
    let bin=''; for(let i=0;i<uint8.byteLength;i++) bin+=String.fromCharCode(uint8[i])
    const fb=btoa(bin); doc.addFileToVFS('NanumGothic.ttf',fb); doc.addFont('NanumGothic.ttf','NanumGothic','normal'); doc.addFont('NanumGothic.ttf','NanumGothic','bold'); doc.setFont('NanumGothic','normal')
    const managers=(() => { try{return JSON.parse((sensor as any).site_managers||'[]')}catch{return []} })()
    let mt='—'; if(managers.length>0){try{const u=await userApi.getList();mt=managers.map((m:string)=>{const f=u.find((x:any)=>x.username===m);return f?`${f.username} (${f.role})`:m}).join(', ')}catch{mt=managers.join(', ')}}
    const pdfSourceRows = chartMode === 'hourly' ? activeMeasurements : dailyReadings
    const pdfSortedRows=[...pdfSourceRows].sort((a:any,b:any)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())
    const pdfInitTimestamp = globalInitReading?.timestamp ?? null
    const pdfInitDate = pdfInitTimestamp ? new Date(pdfInitTimestamp) : (pdfSortedRows.length>0?new Date(pdfSortedRows[0].timestamp):new Date())
    const pdfInitRowData = pdfInitTimestamp ? { timestamp: pdfInitTimestamp, value: initValue, isInitRow: true } : null
    const pdfFirstInRange = pdfSortedRows[0]
    const pdfInitAlreadyInRows = pdfInitRowData && pdfFirstInRange && Math.abs(new Date(pdfInitRowData.timestamp).getTime() - new Date(pdfFirstInRange.timestamp).getTime()) < 60000
    const pdfAllRows = (pdfInitRowData && !pdfInitAlreadyInRows) ? [pdfInitRowData, ...pdfSortedRows] : pdfSortedRows
    doc.setFontSize(16); doc.text('Water Level Meter Report',pageWidth/2,20,{align:'center'})
    autoTable(doc,{startY:28,head:[],body:[['현장명',sensor.siteName||'—','계측기 No.',iconLabel || sensor.manageNo||'—'],['설치현황',sensor.installDate?`설치일자 (${sensor.installDate.slice(0,10)})`:'—','초기측정일',pdfInitDate.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true})]],theme:'grid',styles:{fontSize:9,cellPadding:2,font:'NanumGothic'},columnStyles: { 0: { fillColor: [240,240,240], cellWidth: 27 }, 1: { cellWidth: 64 }, 2: { fillColor: [240,240,240], cellWidth: 27 }, 3: { cellWidth: 64 } }})
    const cy=(doc as any).lastAutoTable.finalY+5
    const chartData = [...(chartMode === 'hourly' ? measurementsWithGaps : dailyReadings)].sort((a:any,b:any)=>new Date(a.timestamp).getTime()-new Date(b.timestamp).getTime())
    if (chartData.length > 0) {
      const chartX = 20, chartY = cy, chartW = pageWidth - 30, chartH = 60
      const values = chartData.filter((r:any) => r.value !== null).map((r:any) => parseFloat(r.value))
      const refVals = [
        ...(level1Lower !== null && !isNaN(level1Lower as number) ? [level1Lower as number] : []),
        ...(level1Upper !== null && !isNaN(level1Upper as number) ? [level1Upper as number] : []),
      ]
      const allVals = [...values, ...refVals]
      const minVal = Math.min(...allVals), maxVal = Math.max(...allVals)
      const padding = (maxVal - minVal) * 0.15 || 1
      const yMin = minVal - padding, yMax = maxVal + padding, range = yMax - yMin

      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
      doc.rect(chartX, chartY, chartW, chartH, 'FD')

      doc.setFontSize(5); doc.setTextColor(140, 140, 140)
      const ySteps = 4
      for (let s = 0; s <= ySteps; s++) {
        const yVal = yMax - (range / ySteps) * s
        const yPos = chartY + (chartH / ySteps) * s
        doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2)
        doc.line(chartX, yPos, chartX + chartW, yPos)
        doc.setTextColor(100, 100, 100)
        doc.text(yVal.toFixed(2), chartX - 1, yPos + 1, { align: 'right' })
      }

      doc.setFontSize(5); doc.setTextColor(100, 100, 100)
      doc.text(`G.L(${sensor.unit})`, chartX + 1, chartY + 4)

      if (level1Lower !== null && !isNaN(level1Lower as number)) {
        const refY = chartY + chartH - ((level1Lower as number - yMin) / range) * chartH
        if (refY >= chartY && refY <= chartY + chartH) {
          doc.setDrawColor(192, 0, 0); doc.setLineWidth(0.5)
          let x = chartX
          while (x < chartX + chartW) { doc.line(x, refY, Math.min(x + 3, chartX + chartW), refY); x += 5 }
          doc.setFontSize(5); doc.setTextColor(192, 0, 0)
          doc.text(`1차 하한기준 (${level1Lower})`, chartX + chartW - 1, refY - 1, { align: 'right' })
        }
      }

      if (level1Upper !== null && !isNaN(level1Upper as number)) {
        const refY = chartY + chartH - ((level1Upper as number - yMin) / range) * chartH
        if (refY >= chartY && refY <= chartY + chartH) {
          doc.setDrawColor(224, 112, 0); doc.setLineWidth(0.5)
          let x = chartX
          while (x < chartX + chartW) { doc.line(x, refY, Math.min(x + 3, chartX + chartW), refY); x += 5 }
          doc.setFontSize(5); doc.setTextColor(224, 112, 0)
          doc.text(`1차 상한기준 (${level1Upper})`, chartX + chartW - 1, refY - 1, { align: 'right' })
        }
      }

      doc.setDrawColor(34, 150, 100); doc.setLineWidth(0.6)
      for (let i = 1; i < chartData.length; i++) {
        const prevVal = chartData[i - 1].value, curVal = chartData[i].value
        if (prevVal === null || curVal === null) continue
        const x1 = chartX + ((i - 1) / (chartData.length - 1)) * chartW
        const x2 = chartX + (i / (chartData.length - 1)) * chartW
        const y1 = chartY + chartH - ((parseFloat(prevVal) - yMin) / range) * chartH
        const y2 = chartY + chartH - ((parseFloat(curVal) - yMin) / range) * chartH
        doc.line(x1, y1, x2, y2)
      }
      doc.setFillColor(34, 150, 100)
      chartData.forEach((r: any, i: number) => {
        if (r.value === null) return
        const x = chartX + (i / (chartData.length - 1)) * chartW
        const y = chartY + chartH - ((parseFloat(r.value) - yMin) / range) * chartH
        const s = 1.2
        doc.setFillColor(34, 150, 100)
        doc.triangle(x, y - s, x + s, y, x, y + s, 'F')
        doc.triangle(x, y - s, x - s, y, x, y + s, 'F')
      })

      doc.setFontSize(5); doc.setTextColor(120, 120, 120)
      const maxLabels = Math.min(6, chartData.length)
      const labelStep = Math.ceil(chartData.length / maxLabels)
      for (let i = 0; i < chartData.length; i += labelStep) {
        const x = chartX + (i / (chartData.length - 1 || 1)) * chartW
        const d = new Date(chartData[i].timestamp)
        doc.text(
          d.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }),
          x, chartY + chartH + 4, { align: 'center' }
        )
      }

      const legendY = chartY + chartH + 10
      const centerX = chartX + chartW / 2
      doc.setFontSize(6)

      doc.setDrawColor(34, 150, 100); doc.setLineWidth(1.0)
      doc.line(centerX - 52, legendY, centerX - 44, legendY)
      doc.setTextColor(34, 150, 100)
      doc.text(`── ${iconLabel || sensor.manageNo || sensor.name}`, centerX - 42, legendY + 0.5)

      if (level1Lower !== null) {
        doc.setDrawColor(192, 0, 0); doc.setLineWidth(0.6)
        let lx = centerX - 3
        while (lx < centerX + 5) { doc.line(lx, legendY, Math.min(lx + 3, centerX + 5), legendY); lx += 5 }
        doc.setTextColor(192, 0, 0)
        doc.text('- - - 1차 하한기준', centerX + 7, legendY + 0.5)
      }

      if (level1Upper !== null) {
        doc.setDrawColor(224, 112, 0); doc.setLineWidth(0.6)
        let lx = centerX + 42
        while (lx < centerX + 50) { doc.line(lx, legendY, Math.min(lx + 3, centerX + 50), legendY); lx += 5 }
        doc.setTextColor(224, 112, 0)
        doc.text('- - - 1차 상한기준', centerX + 52, legendY + 0.5)
      }

      doc.setTextColor(0, 0, 0)
    }
    const pdfFmtDiff=(v:number)=>v>0?`▲ ${v.toFixed(4)}`:v<0?`▼ ${Math.abs(v).toFixed(4)}`:'0.0000'
    const pdfHead=chartMode==='daily'?[['측정일','경과일',`지하수위 G.L(${sensor.unit})`,'일일 변화량','누적 변화량','비고']]:[['측정일','경과일',`지하수위 G.L(${sensor.unit})`,'누적 변화량','비고']]
    autoTable(doc,{startY:cy+75,head:pdfHead,body:pdfAllRows.map((r:any,i:number)=>{
      const rd=new Date(r.timestamp),cm=new Date(rd.getFullYear(),rd.getMonth(),rd.getDate()),im=new Date(pdfInitDate.getFullYear(),pdfInitDate.getMonth(),pdfInitDate.getDate()),el=Math.round((cm.getTime()-im.getTime())/86400000),dk=rd.toLocaleString('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:true})
      if(r.value===null) return chartMode==='daily'?[dk,'—','미수신','—','—','']:[dk,'—','미수신','—','']
      const cv=parseFloat(parseFloat(String(r.value)).toFixed(4))
      const prevValid=pdfAllRows.slice(0,i).reverse().find((x:any)=>x.value!==null)
      const pv=prevValid?parseFloat(parseFloat(String(prevValid.value)).toFixed(4)):cv
      const pd=parseFloat((cv-pv).toFixed(4)),id_=parseFloat((cv-initValue).toFixed(4))
      const isFirst=!!(r.isInitRow)||(i===0&&!pdfInitRowData)
      if(chartMode==='daily') return[dk,el,cv.toFixed(4),isFirst?'0.0000':pdfFmtDiff(pd),isFirst?'0.0000':pdfFmtDiff(id_),isFirst?'초기치':'']
      return[dk,el,cv.toFixed(4),isFirst?'0.0000':pdfFmtDiff(id_),isFirst?'초기치':'']
    }),theme:'grid',headStyles:{fillColor:[60,80,120],textColor:255,fontSize:8,font:'NanumGothic',fontStyle:'normal'},styles:{fontSize:8,cellPadding:2,font:'NanumGothic'},didParseCell:(data:any)=>{
      if(data.section!=='body') return
      const text=String(data.cell.text[0]||'')
      const changeCols=chartMode==='daily'?[3,4]:[3]
      if(changeCols.includes(data.column.index)){
        if(text.startsWith('▲')) data.cell.styles.textColor=[220,38,38]
        else if(text.startsWith('▼')) data.cell.styles.textColor=[37,99,235]
      }
    }})
    doc.save(`${iconLabel || sensor.manageNo||sensor.name}_${dateFrom}_${dateTo}.pdf`)
  }

  return { handleExcelDownload, handlePdfDownload }
}
