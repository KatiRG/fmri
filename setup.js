var scenario_clicked;
var threshold_clicked;

var highchart;
var avgAreaGroup;


$(document).ready(function() {

    //document.getElementById("ts-button").disabled = true;

    // $("#jqxwindow").jqxWindow({
    //         height:450, width: 900,
    //         showCollapseButton: true,
    //         initContent: function () {
    //             $('#tab').jqxTabs({ height: '100%', width:  '100%' });
    //         },
    //         autoOpen: false
    //     });

    var chart;    
    
    subjectChart = dc.rowChart("#chart-subject");
    categoryChart = dc.pieChart("#chart-category");
    runChart = dc.rowChart("#chart-run");
    //hemChart = dc.pieChart("#chart-hem");
    areaChart = dc.rowChart("#chart-area");
    //powerChart = dc.barChart("#chart-power");
    stackedPowerChart = dc.barChart("#chart-stackedPower");
    
    d3.csv("data/dcjs_power.csv", function(csv) { //contains snow
        
        subjects_def = {
                0: "subj 0",
                1: "subj 1",
                2: "subj 2"
        };

        type_def = {
                "P": "Patients",
                "C": "Controls"
        };

        areas_def = {
                "IPL": "Inferior Parietal Lobule",
                "Insula": "Insula",
                "PCG": "Post-Central Gyrus",
                "SMG": "Supra-Marginal Gyrus"
        };

        pband_def={       
            1: "0.002 - 0.055 Hz",
            2: "0.155 - 0.235 Hz"
        }

        category_colours = ["#BCE1D9", "#992526"];

        var filter = crossfilter(csv);
        var all = filter.groupAll();

        var subjectDimension = filter.dimension(function(d) { return +d.subject; }),
            categoryDimension = filter.dimension(function(d) { return d.category; }),
            runDimension = filter.dimension(function(d, i) { return +d.run; }),            
            hemDimension = filter.dimension(function(d) { return d.hem; }),
            areaDimension = filter.dimension(function(d) { return d.area; }),
            pbandDimension = filter.dimension(function(d) { return +d.powerband; });
            

        var subjectGroup = subjectDimension.group(),
            categoryGroup = categoryDimension.group(),
            runGroup = runDimension.group(),
            hemGroup = hemDimension.group(),
            areaGroup = areaDimension.group(),
            pbandGroup = pbandDimension.group();   

        avgAreaGroup = areaDimension.group().reduce(reduceAdd, reduceRemove, reduceInitial);

        //Fns to count data for all datasets except the OBS data (id=100).
        function reduceAdd(p, v) {
            if (v.run == 3) {
                ++p.count;
                p.ratio3to1 += +v.relative;
                p.avgRatio3to1 = p.ratio3to1/p.count;
            }

             return p;
        }

        function reduceRemove(p, v) {
             if (v.run == 3) {
                --p.count;
                p.ratio3to1 -= +v.relative;
                p.avgRatio3to1 = p.ratio3to1/p.count;
            }           

            return p;
        }

        function reduceInitial() {
                return {
                    count: 0, ratio3to1: 0, avgRatio3to1: 0
                };
        }    

        //========================================
        avgRunByBand = runDimension.group().reduce(
            // add
            function(p, v) {

                if (v.powerband == 1) {
                    ++p.run1Count;
                    p.run1Power += +v.relative;
                    p.run1Avg = p.run1Power/p.run1Count;
                }
                if (v.powerband == 2) {
                    ++p.run2Count;
                    p.run2Power += +v.relative;
                    p.run2Avg = p.run2Power/p.run2Count;
                }           
               
                return p;
            },
            // remove
            function(p, v) {
        
                if (v.powerband == 1) {
                    --p.run1Count;
                    p.run1Power -= +v.relative;
                    p.run1Avg = p.run1Power/p.run1Count;
                }
                if (v.powerband == 2) {
                    --p.run2Count;
                    p.run2Power -= +v.relative;
                    p.run2Avg = p.run2Power/p.run2Count;
                }     
                   
                return p;
            },
            // init
            function() {
                return {                        
                        run1Count: 0, run1Power: 0, run1Avg: 0,
                        run2Count: 0, run2Power: 0, run2Avg: 0
                };
            }
        );
        //end avg stacked bar chart             
  
        // ===============================================================================================
        //  DEFINE CHARTS
        // ===============================================================================================        
      
        // =================
        categoryChart
            .width(50)
            .height(50)
            .slicesCap(4)
            .innerRadius(10)
            .colors([category_colours[0], category_colours[1]])
            .dimension(categoryDimension)                    
            .group(categoryGroup)
            .legend(dc.legend())
            .title(function(d) {              
                if (d.data.value != 0) {
                    var label;
                           
                    if (all.value()) {                                
                        label = type_def[d.data.key] +": "+ Math.round(d.value / all.value() * 100) +" %";
                    }
                    return label;
                }
            })
            .renderlet(function (chart) {
                chart.selectAll("g").selectAll("text.pie-slice._0").attr("transform", "translate(36,-10)");
                chart.selectAll("g").selectAll("text.pie-slice._1").attr("transform", "translate(-33, 0)");
            });
           
        
            // =================
            subjectChart
                    .width(300).height(243)
                    // .margins({
                    //     top: 10,
                    //     right: 30,
                    //     bottom: 30,
                    //     left: 10
                    // })
                    .dimension(subjectDimension)
                    .group(subjectGroup)
                    .colors([category_colours[1], category_colours[0], category_colours[1]])
                    //.colors(["#888888"])
                    .label(function(d) {
                        return subjects_def[d.key];
                    })
                    .title(function(d) {
                        return subjects_def[d.key] + ": " + d.value + " scans";
                    })
                    .gap(2.5);

            // //Fix x-axis (http://stackoverflow.com/questions/29921847/fixed-x-axis-in-dc-js-rowchart)
            // subjectChart
            //         .x(d3.scale.linear().range([0,(datasetChart.width()-50)]).domain([0,100]));
            subjectChart
                    .xAxis().scale(subjectChart.x()).tickValues([0, 4, 8, 12, 16, 20, 24]);

             // =================
            runChart
                    .width(300).height(243)
                    // .margins({
                    //     top: 10,
                    //     right: 30,
                    //     bottom: 30,
                    //     left: 10
                    // })
                    .dimension(runDimension)
                    .group(runGroup)
                    .colors(["#888888"])
                    .label(function(d) {
                        return d.key;
                    })
                    .title(function(d) {
                        return d.key + ": " + d.value + " scans";
                    })
                    .gap(2.5);

            // //Fix x-axis (http://stackoverflow.com/questions/29921847/fixed-x-axis-in-dc-js-rowchart)
            // subjectChart
            //         .x(d3.scale.linear().range([0,(datasetChart.width()-50)]).domain([0,100]));
            runChart
                    .xAxis().scale(runChart.x()).tickValues([0, 4, 8, 12, 16, 20, 24]);

             // =================
            areaChart
                    .width(200).height(243)
                    .dimension(areaDimension)
                    .group(areaGroup)
                    // .group(avgAreaGroup)
                    // .valueAccessor(function(d) {
                        
                    //     return d.value.avgRatio3to1;
                    // })   
                    .colors(["#888888"])            
                    .label(function(d) {
                        return d.key;
                    })
                    .title(function(d) {
                        //return areas_def[d.key] + ": " + d3.format(".2g")(d.value.avgRatio3to1);
                        return areas_def[d.key];
                    })
                    .gap(2.5);

            areaChart
                //.xAxis().tickFormat(d3.format("d")).tickValues([0, 1, 2]); 
                .xAxis().tickFormat(d3.format("d")).tickValues([0,6,12,18]);       

            // areaChart
            //         .yAxis().tickFormat(d3.format("d")).tickValues([0, 20, 40, 60, 80, 100]);


            // ==================    
            stackedPowerChart
                    .width(690)
                    .height(243)
                    .dimension(pbandDimension)                                    
                    .renderHorizontalGridLines(true)
                    .centerBar(true)
                    //.colors(seasonsColours) //DJF, MAM, JJA, SON                                   
                    .group(avgRunByBand, 1)
                    .valueAccessor(function(d) {
   
                        return d.value.run1Avg;
                    
                    })
                    .stack(avgRunByBand, 2, function(d) {
                        
                        return d.value.run2Avg;                    
                    })
                    .centerBar(true)
                    .elasticY(false)
                    .brushOn(false)
                    .gap(20)
                    .title(function(d) {
                        //return areas_def[d.key] + ": " + d3.format(".2g")(d.value.avgRatio3to1);
                        console.log("d in stack: ", d)
                        return "Run " + d.data.key;
                    })
                    .x(d3.scale.ordinal().domain(["run1", "run2", "run3"]))
                    .xUnits(dc.units.ordinal) // Tell dc.js that we're using an ordinal x-axis;
                    //.x(d3.scale.linear().domain([0,3]))                    
                    .y(d3.scale.linear().domain([0, 5]));
       
            // stackedPowerChart
            //         .xAxis().ticks(2).tickFormat(d3.format("d")).tickValues([1975, 2000, 2025, 2050, 2075, 2100]);
            // stackedPowerChart
            //         .yAxis().tickValues([0, 0.25, 0.50, 1.0]);

       

    

              
          
            // =================
            // dataTable = dc.dataTable("#dc-data-table");
            // dataTable
            //         .dimension(yearDimension)
            //         .group(function(d) {
            //             return ""
            //         })
            //         .size(20)
            //         .columns([
            //             function(d) {
            //                 return d.Year;
            //             },
            //             function(d) {
            //                 return regions[d.Region];
            //             },
            //             function(d) {
            //                 return indexID[d.Index];
            //             },
            //             function(d) {
            //                 return models[d.Model];
            //             }
            //         ])
            //         .sortBy(function(d) {
            //             return d.Year;
            //         })
            //         .order(d3.ascending);

            // =================


            // =================
            dc.renderAll();

            //http://stackoverflow.com/questions/21114336/how-to-add-axis-labels-for-row-chart-using-dc-js-or-d3-js
            function AddXAxis(chartToUpdate, displayText)
            {
                chartToUpdate.svg()
                            .append("text")
                            .attr("class", "x-axis-label")
                            .attr("text-anchor", "middle")
                            .attr("x", chartToUpdate.width()/2.5)
                            .attr("y", chartToUpdate.height()+2)
                            .text(displayText);
            }
            AddXAxis(subjectChart, "Number of Scans");
            AddXAxis(runChart, "Number of Scans");
            AddXAxis(areaChart, "Number of Scans");
            AddXAxis(stackedPowerChart, "blue = 0.002 - 0.055 Hz, orange = 0.155 - 0.235 Hz");
   

            // =================
           
        
            // =================
            //Show timeseries if button is clicked
            //document.getElementById('ts-button').onclick = function() { console.log(tsRegion); showTimeSeries(tsRegion); }

        


           
    }); //end csv
}) //end document.ready

// function resetTSbutton() {
//     document.getElementById("ts-button").disabled = true;
// }


//--------------------------------------------------------------------
//  TIME SERIES PLOTTIING
//--------------------------------------------------------------------

