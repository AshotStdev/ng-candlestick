import {AfterViewInit, Component, Input} from '@angular/core';
import * as techan from 'techan';
import * as d3TimeFormat from 'd3-time-format';
declare const d3;

@Component({
  selector: 'app-candlestick',
  templateUrl: './candlestick.component.html'
})
export class CandlestickComponent implements AfterViewInit {
  @Input() chartMargin = {top: 20, right: 50, bottom: 30, left: 50};
  @Input() height: number;
  @Input() width: number;
  @Input() dateFormat: string;
  @Input() data;
  @Input() lineData = [];
  parentElement;
  // data
  private candlestickData;
  private trendlineData;
  private supstanceData;
  private macdData;
  private rsiData;
  // svg components
  private svg;
  private parentG;
  private defs;
  private accessor;
  private indicatorPreRoll = 12;
  private trades;
  private valuesG;
  private dim;
  private parseDate;
  private indicatorTop;
  private zoom;
  private supstance;
  // axises
  private x;
  private y;
  private yPercent;
  private yInit;
  private yPercentInit;
  private zoomableInit;
  private yVolume;
  private xAxis;
  private yAxis;
  private volumeAxis;
  private macdAxis;
  private rsiAxis;
  private rsiAxisLeft;
  private macdAxisLeft;
  private percentAxis;
  // candlestick
  private candlestick;
  /*private tradeArrow;*/
  // accessors
  private sma0;
  private sma1;
  private ema2;
  private volume;
  private trendLine;
  private macd;
  private rsi;
  private line;
  private lineG;
  // annotations
  private timeAnnotation;
  private ohlcAnnotation;
  private closeAnnotation;
  private percentAnnotation;
  private volumeAnnotation;
  private macdAnnotation;
  private macdAnnotationLeft;
  private rsiAnnotation;
  private rsiAnnotationLeft;
  // scales
  private macdScale;
  private rsiScale;
  // crosshairs
  private ohlcCrosshair;
  private macdCrosshair;
  private rsiCrosshair;
  // selections
  private ohlcSelection;
  private indicatorSelection;
  // candle values texts
  private candleValueOpen;
  private candleValueClose;
  private candleValueHigh;
  private candleValueLow;
  // array bisector
  private bisect;

  constructor() {
  }

  ngAfterViewInit() {
    this.initChartSize();
    this.initSvg();
    this.setDateFormat();
    this.initChartComponents();
    this.createChart();
    this.initData();
    this.responsivefy();
  }

  initChartSize() {
    this.dim = {
      width: this.width, height: this.height,
      margin: {top: 20, right: 50, bottom: 30, left: 50},
      ohlc: {height: this.height - 195},
      indicator: {height: null, padding: 5, top: null, bottom: null},
      plot: null,
      values: {close: 80, open: 20, high: 40, low: 60}
    };
    this.dim.plot = {
      width: this.dim.width - this.dim.margin.left - this.dim.margin.right,
      height: this.dim.height - this.dim.margin.top - this.dim.margin.bottom
    };
    this.dim.indicator.height = this.dim.ohlc.height / 4;
    this.dim.indicator.top = this.dim.ohlc.height - this.dim.indicator.height + this.dim.indicator.padding;
    this.dim.indicator.bottom = this.dim.indicator.top + this.dim.indicator.height + this.dim.indicator.padding;
  }

  initChartComponents() {
    this.initZoom();

    this.createScales();

    this.createAxises();

    this.createStrategies();

    this.createChartComponents();

    this.createAnnotations();

    this.createCrossHairs();
  }

  createChartComponents() {
    this.candlestick = techan.plot.candlestick()
      .xScale(this.x)
      .yScale(this.y);

    this.volume = techan.plot.volume()
      .accessor(this.candlestick.accessor())   // Set the accessor to a ohlc accessor so we get highlighted bars
      .xScale(this.x)
      .yScale(this.yVolume);

    this.trendLine = techan.plot.trendline()
      .xScale(this.x)
      .yScale(this.y);

    this.supstance = techan.plot.supstance()
      .xScale(this.x)
      .yScale(this.y);

    this.macd = techan.plot.macd()
      .xScale(this.x)
      .yScale(this.macdScale);

    this.rsi = techan.plot.rsi()
      .xScale(this.x)
      .yScale(this.rsiScale);

    this.defs = this.svg.append('defs');

    this.line = d3.line()
      .x((d) => this.x(d.date))
      .y((d) => this.y(d.value));
  }

  setDateFormat() {
    if (typeof this.dateFormat === 'undefined') {
      this.parseDate = d3.timeParse('%d-%b-%y');
    } else {
      this.parseDate = d3.timeParse(this.dateFormat);
    }
  }

  createScales() {
    this.x = techan.scale.financetime.utc()
      .range([0, this.dim.plot.width]);

    this.y = d3.scaleLinear()
      .range([this.dim.ohlc.height, 0]);

    this.yPercent = this.y.copy();

    this.yVolume = d3.scaleLinear()
      .range([this.y(0), this.y(0.2)]);

    this.indicatorTop = d3.scaleLinear()
      .range([this.dim.indicator.top, this.dim.indicator.bottom]);

    this.macdScale = d3.scaleLinear()
      .range([this.indicatorTop(0) + this.dim.indicator.height, this.indicatorTop(0)]);

    this.rsiScale = this.macdScale.copy()
      .range([this.indicatorTop(1) + this.dim.indicator.height, this.indicatorTop(1)]);
  }

  createAxises() {
    this.xAxis = d3.axisBottom(this.x);

    this.yAxis = d3.axisRight(this.y);

    this.percentAxis = d3.axisLeft(this.yPercent)
      .tickFormat(d3.format('+.1%'));

    this.volumeAxis = d3.axisRight(this.yVolume)
      .ticks(3)
      .tickFormat(d3.format(',.3s'));

    this.macdAxis = d3.axisRight(this.macdScale)
      .ticks(3);

    this.macdAxisLeft = d3.axisLeft(this.macdScale)
      .ticks(3);

    this.rsiAxis = d3.axisRight(this.rsiScale)
      .ticks(3);

    this.rsiAxisLeft = d3.axisLeft(this.rsiScale)
      .ticks(3);
  }

  initZoom() {
    this.zoom = d3.zoom()
      .scaleExtent([0.1, 6])
      .translateExtent([[-Infinity, -2 * this.dim.plot.height], [2 * this.dim.plot.width, Infinity]])
      .on('zoom', this.zoomed.bind(this));
  }

  createStrategies() {
    this.sma0 = techan.plot.sma()
      .xScale(this.x)
      .yScale(this.y);
    this.sma1 = techan.plot.sma()
      .xScale(this.x)
      .yScale(this.y);
    this.ema2 = techan.plot.ema()
      .xScale(this.x)
      .yScale(this.y);
  }

  initSvg() {
    this.svg = d3.select('svg')
      .style('overflow', 'visible')
      .attr('width', this.dim.width)
      .attr('height', this.dim.height);
  }

  createCrossHairs() {
    this.ohlcCrosshair = techan.plot.crosshair()
      .xScale(this.timeAnnotation.axis().scale())
      .yScale(this.ohlcAnnotation.axis().scale())
      .xAnnotation(this.timeAnnotation)
      .yAnnotation([this.ohlcAnnotation, this.percentAnnotation, this.volumeAnnotation])
      .verticalWireRange([0, (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding)])
      .on('enter', this.enter.bind(this))
      .on('out', this.out.bind(this))
      .on('move', this.move.bind(this));

    this.macdCrosshair = techan.plot.crosshair()
      .xScale(this.timeAnnotation.axis().scale())
      .yScale(this.macdAnnotation.axis().scale())
      .xAnnotation(this.timeAnnotation)
      .yAnnotation([this.macdAnnotation, this.macdAnnotationLeft])
      .verticalWireRange([0, (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding)]);

    this.rsiCrosshair = techan.plot.crosshair()
      .xScale(this.timeAnnotation.axis().scale())
      .yScale(this.rsiAnnotation.axis().scale())
      .xAnnotation(this.timeAnnotation)
      .yAnnotation([this.rsiAnnotation, this.rsiAnnotationLeft])
      .verticalWireRange([0, (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding)]);
  }

  createAnnotations() {
    this.timeAnnotation = techan.plot.axisannotation()
      .axis(this.xAxis)
      .orient('bottom')
      .format(d3TimeFormat.timeFormat('%Y-%m-%d'))
      .width(65)
      .translate([0, (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding)]);

    this.ohlcAnnotation = techan.plot.axisannotation()
      .axis(this.yAxis)
      .orient('right')
      .format(d3.format(',.2f'))
      .translate([this.x(1), 0]);

    this.closeAnnotation = techan.plot.axisannotation()
      .axis(this.yAxis)
      .orient('right')
      .accessor(this.candlestick.accessor())
      .format(d3.format(',.2f'))
      .translate([this.x(1), 0]);

    this.percentAnnotation = techan.plot.axisannotation()
      .axis(this.percentAxis)
      .orient('left');

    this.volumeAnnotation = techan.plot.axisannotation()
      .axis(this.volumeAxis)
      .orient('right')
      .width(35);

    this.macdAnnotation = techan.plot.axisannotation()
      .axis(this.macdAxis)
      .orient('right')
      .format(d3.format(',.2f'))
      .translate([this.x(1), 0]);

    this.rsiAnnotation = techan.plot.axisannotation()
      .axis(this.rsiAxis)
      .orient('right')
      .format(d3.format(',.2f'))
      .translate([this.x(1), 0]);

    this.macdAnnotationLeft = techan.plot.axisannotation()
      .axis(this.macdAxisLeft)
      .orient('left')
      .format(d3.format(',.2f'));

    this.rsiAnnotationLeft = techan.plot.axisannotation()
      .axis(this.rsiAxisLeft)
      .orient('left')
      .format(d3.format(',.2f'));
  }

  createCandleStickValuesG() {
    this.valuesG = this.parentG.append('g')
      .attr('class', 'values');

    this.bisect = d3.bisector((d) => d.date).left;
    this.candleValueOpen = this.valuesG.append('text')
      .style('text-anchor', 'start')
      .attr('class', 'text-open')
      .attr('font-size', '1em')
      .attr('x', 20)
      .attr('y', this.dim.values.open);

    this.candleValueClose = this.valuesG.append('text')
      .style('text-anchor', 'start')
      .attr('class', 'text-close')
      .attr('font-size', '1em')
      .attr('x', 20)
      .attr('y', this.dim.values.close);

    this.candleValueHigh = this.valuesG.append('text')
      .style('text-anchor', 'start')
      .attr('class', 'text-high')
      .attr('font-size', '1em')
      .attr('x', 20)
      .attr('y', this.dim.values.high);
    this.candleValueLow = this.valuesG.append('text')
      .style('text-anchor', 'start')
      .attr('class', 'text-low')
      .attr('font-size', '1em')
      .attr('x', 20)
      .attr('y', this.dim.values.low);
  }

  createChart() {
    this.parentG = this.svg.append('g')
      .attr('transform', 'translate(' + this.dim.margin.left + ',' + this.dim.margin.top + ')');

    this.defs.append('clipPath')
      .attr('id', 'ohlcClip')
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', this.dim.plot.width)
      .attr('height', this.dim.ohlc.height);

    this.defs.selectAll('indicatorClip').data([0, 1])
      .enter()
      .append('clipPath')
      .attr('id', (d, i) => 'indicatorClip-' + i)
      .append('rect')
      .attr('x', 0)
      .attr('y', (d, i) => this.indicatorTop(i))
      .attr('width', this.dim.plot.width)
      .attr('height', this.dim.indicator.height);

    this.parentG.append('text')
      .attr('class', 'symbol')
      .attr('x', 20)
      .text('STDev');

    this.parentG.append('g')
      .attr('overflow', 'visible')
      .attr('class', 'x axis')
      .attr('transform', 'translate(0,' + (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding) + ')');

    this.svg.select('.axisannotation.x')
      .attr('transform', 'translate(0,' + (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding) + ')');
    this.ohlcSelection = this.parentG.append('g')
      .attr('class', 'ohlc')
      .attr('overflow', 'visible')
      .attr('transform', 'translate(0,0)');

    this.createCandleStickValuesG();

    this.ohlcSelection.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(' + this.x(1) + ',0)')
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -10)
      .attr('dy', '.0em')
      .style('text-anchor', 'end')
      .text('Price ($)');

    this.ohlcSelection.append('g')
      .attr('class', 'close annotation up');

    this.ohlcSelection.append('g')
      .attr('class', 'volume')
      .attr('clip-path', 'url(#ohlcClip)');

    this.ohlcSelection.append('g')
      .attr('class', 'candlestick')
      .attr('overflow', 'hidden')
      .attr('clip-path', 'url(#ohlcClip)');

    this.ohlcSelection.append('g')
      .attr('class', 'indicator sma ma-0')
      .attr('clip-path', 'url(#ohlcClip)');

    this.ohlcSelection.append('g')
      .attr('overflow', 'hidden')
      .attr('class', 'indicator sma ma-1')
      .attr('clip-path', 'url(#ohlcClip)');

    this.ohlcSelection.append('g')
      .attr('class', 'indicator ema ma-2')
      .attr('clip-path', 'url(#ohlcClip)');

    this.ohlcSelection.append('g')
      .attr('class', 'percent axis');

    this.ohlcSelection.append('g')
      .attr('class', 'volume axis');

    this.indicatorSelection = this.parentG.selectAll('svg > g.indicator').data(['macd', 'rsi']).enter()
      .append('g')
      .attr('class', (d) => d + ' indicator');
    this.indicatorSelection.append('g')
      .attr('class', 'axis right')
      .attr('transform', 'translate(' + this.x(1) + ',0)');

    this.indicatorSelection.append('g')
      .attr('class', 'axis left')
      .attr('transform', 'translate(' + this.x(0) + ',0)');

    this.indicatorSelection.append('g')
      .attr('class', 'indicator-plot')
      .attr('clip-path', (d, i) => 'url(#indicatorClip-' + i + ')');

    this.parentG.append('g')
      .attr('class', 'crosshair ohlc');

    this.parentG.append('g')
      .attr('class', 'crosshair macd');

    this.parentG.append('g')
      .attr('class', 'crosshair rsi');

    // this.lineG = this.svg.append('g')
    //   .attr('transform',
    //     'translate(' + this.dim.margin.left + ',' + this.dim.margin.top + ')'
    //   );
    //
    // this.lineG.append('g')
    //   .attr('transform', 'translate(0,' + (this.dim.indicator.bottom + this.dim.indicator.height + this.dim.indicator.padding) + ')');
    //
    // this.lineG.append('path')
    //   .datum(this.lineData)
    //   .attr('fill', 'none')
    //   .attr('stroke', 'steelblue')
    //   .attr('stroke-linejoin', 'round')
    //   .attr('stroke-linecap', 'round')
    //   .attr('stroke-width', 1.5)
    //   .attr('clip-path', 'url(#ohlcClip)')
    //   .attr('d', this.line);
  }

  private zoomed() {
    this.x.zoomable().clamp(true).domain(d3.event.transform.rescaleX(this.zoomableInit).domain());
    // this.yAxis.scale(d3.event.transform.rescaleY(this.y));
    // this.candlestick.yScale(d3.event.transform.rescaleY(this.y));
    // this.y.domain(d3.event.transform.rescaleY(this.yInit).domain());
    // this.yPercent.domain(d3.event.transform.rescaleY(this.yPercentInit).domain());
    this.draw();
  }

  private draw() {
    this.svg.select('g.x.axis').call(this.xAxis);
    this.svg.select('g.ohlc .axis').call(this.yAxis);
    this.svg.select('g.volume.axis').call(this.volumeAxis);
    this.svg.select('g.percent.axis').call(this.percentAxis);
    this.svg.select('g.macd .axis.right').call(this.macdAxis);
    this.svg.select('g.rsi .axis.right').call(this.rsiAxis);
    this.svg.select('g.macd .axis.left').call(this.macdAxisLeft);
    this.svg.select('g.rsi .axis.left').call(this.rsiAxisLeft);

    // We know the data does not change, a simple refresh that does not perform data joins will suffice.
    this.svg.select('g.candlestick').call(this.candlestick.refresh);
    this.svg.select('g.close.annotation').call(this.closeAnnotation.refresh);
    this.svg.select('g.volume').call(this.volume.refresh);
    this.svg.select('g .sma.ma-0').call(this.sma0.refresh);
    this.svg.select('g .sma.ma-1').call(this.sma1.refresh);
    this.svg.select('g .ema.ma-2').call(this.ema2.refresh);
    this.svg.select('g.macd .indicator-plot').call(this.macd.refresh);
    this.svg.select('g.rsi .indicator-plot').call(this.rsi.refresh);
    this.svg.select('g.crosshair.ohlc').call(this.ohlcCrosshair.refresh);
    this.svg.select('g.crosshair.macd').call(this.macdCrosshair.refresh);
    this.svg.select('g.crosshair.rsi').call(this.rsiCrosshair.refresh);
    this.svg.select('g.trendlines').call(this.trendLine.refresh);
    this.svg.select('g.supstances').call(this.supstance.refresh);
  }

  initData() {
    this.accessor = this.candlestick.accessor();
    this.candlestickData = this.data.map((d) => {
      return {
        date: d.time_period_start,
        open: d.price_open,
        high: d.price_high,
        low: d.price_low,
        close: d.price_close,
        volume: +d.volume_traded
      };
    }).sort((a, b) => d3.ascending(this.accessor.d(a), this.accessor.d(b)));

    this.domainData(this.candlestickData);

    // this.trendlineData = [
    //   {start: {date: new Date(2018, 10, 1), value: 72.50}, end: {date: new Date(2018, 10, 24), value: 63.34}},
    //   {start: {date: new Date(2018, 10, 1), value: 43}, end: {date: new Date(2018, 10, 24), value: 70.50}}
    // ];
    //
    // this.supstanceData = [
    //   {start: new Date(2018, 10, 1), end: new Date(2018, 10, 24), value: 63.64},
    //   {start: new Date(2018, 10, 1), end: new Date(2018, 10, 24), value: 55.50}
    // ];

    // this.trades = [
    //   {date: data[0].date, type: 'buy', price: data[0].low, low: data[0].low, high: data[0].high},
    //   {date: data[8].date, type: 'sell', price: data[8].high, low: data[8].low, high: data[8].high},
    //   {date: data[12].date, type: 'buy', price: data[12].low, low: data[12].low, high: data[12].high},
    //   {date: data[15].date, type: 'sell', price: data[15].low, low: data[15].low, high: data[15].high}
    // ];

    this.appendDataToSvg(this.candlestickData);

    this.slashZoom(this.candlestickData);

    this.draw();
  }

  private domainData(data: any) {
    this.x.domain(techan.scale.plot.time(data).domain());
    this.y.domain(techan.scale.plot.ohlc(data.slice(this.indicatorPreRoll)).domain());
    this.yPercent.domain(techan.scale.plot.percent(this.y, this.accessor(data[this.indicatorPreRoll])).domain());
    this.yVolume.domain(techan.scale.plot.volume(data).domain());

    this.macdData = techan.indicator.macd()(data);
    this.macdScale.domain(techan.scale.plot.macd(this.macdData).domain());
    this.rsiData = techan.indicator.rsi()(data);
    this.rsiScale.domain(techan.scale.plot.rsi(this.rsiData).domain());
  }

  private appendDataToSvg(data: any) {
    this.svg.select('g.candlestick').datum(data).call(this.candlestick);
    this.svg.select('g.close.annotation').datum([data[data.length - 1]]).call(this.closeAnnotation);
    this.svg.select('g.volume').datum(data).call(this.volume);
    this.svg.select('g.sma.ma-0').datum(techan.indicator.sma().period(5)(data)).call(this.sma0);
    this.svg.select('g.sma.ma-1').datum(techan.indicator.sma().period(14)(data)).call(this.sma1);
    this.svg.select('g.ema.ma-2').datum(techan.indicator.ema().period(4)(data)).call(this.ema2);
    this.svg.select('g.macd .indicator-plot').datum(this.macdData).call(this.macd);
    this.svg.select('g.rsi .indicator-plot').datum(this.rsiData).call(this.rsi);

    this.svg.select('g.crosshair.ohlc').call(this.ohlcCrosshair).call(this.zoom);
    this.svg.select('g.crosshair.macd').call(this.macdCrosshair).call(this.zoom);
    this.svg.select('g.crosshair.rsi').call(this.rsiCrosshair).call(this.zoom);
    // this.svg.select('g.trendlines').datum(this.trendlineData).call(this.trendLine).call(this.trendLine.drag);
    this.svg.select('g.supstances').datum(this.supstanceData).call(this.supstance).call(this.supstance.drag);
  }

  private slashZoom(data: any) {
    this.zoomableInit = this.x.zoomable().domain([this.indicatorPreRoll, data.length]).copy();
    this.yInit = this.y.copy();
    this.yPercentInit = this.yPercent.copy();
  }

  enter() {
    this.candleValueLow.style('display', 'inline');
    this.candleValueHigh.style('display', 'inline');
    this.candleValueClose.style('display', 'inline');
    this.candleValueOpen.style('display', 'inline');
  }

  out() {
    this.candleValueLow.style('display', 'none');
    this.candleValueHigh.style('display', 'none');
    this.candleValueClose.style('display', 'none');
    this.candleValueOpen.style('display', 'none');
  }

  move(coords) {
    const i = this.bisect(this.candlestickData, coords.x),
      d0 = this.candlestickData[i - 1],
      d1 = this.candlestickData[i],
      d = coords.x - d0.date > d1.date - coords.x ? d1 : d0;
    this.candleValueClose.text(
      'Close ' + d.close
    );
    this.candleValueOpen.text(
      'Open ' + d.open
    );
    this.candleValueHigh.text(
      'High ' + d.high
    );
    this.candleValueLow.text(
      'Low ' + d.low
    );
    if (d.open > d.close) {
      this.candleValueOpen.style('fill', '#82140d');
      this.candleValueHigh.style('fill', '#82140d');
      this.candleValueLow.style('fill', '#82140d');
      this.candleValueClose.style('fill', '#82140d');
    } else {
      this.candleValueOpen.style('fill', '#306a15');
      this.candleValueHigh.style('fill', '#306a15');
      this.candleValueLow.style('fill', '#306a15');
      this.candleValueClose.style('fill', '#306a15');
    }
  }

  responsivefy() {
    // get container + svg aspect ratio
    this.parentElement = d3.select(this.svg.node().parentNode.parentNode);
    this.width = parseInt(this.svg.style('width'), 10);
    this.height = parseInt(this.svg.style('height'), 10);

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    this.svg.attr('viewBox', '0 0 ' + this.width + ' ' + this.height)
      .attr('preserveAspectRatio', 'xMinYMid')
      .call(this.resize.bind(this));

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    this.resize();
    d3.select(window).on('resize.' + this.parentElement.attr('id'), this.resize.bind(this));
  }

  // get width of container and resize svg to fit it
  resize() {
    const targetWidth = parseInt(this.parentElement.style('width'), 10);
    this.svg.attr('width', targetWidth);
    this.svg.attr('height', Math.round(targetWidth / (this.width / this.height)));
  }
}
