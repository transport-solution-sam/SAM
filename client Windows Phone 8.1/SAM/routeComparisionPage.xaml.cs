using SAM.Common;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Graphics.Display;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;
using Windows.UI.Xaml.Controls.Maps;
using Windows.Devices.Geolocation;
using Windows.UI;
using Windows.UI.Popups;

namespace SAM
{
    public sealed partial class routeComparisionPage : Page
    {
        

        private NavigationHelper navigationHelper;
        private ObservableDictionary defaultViewModel = new ObservableDictionary();

        //-----------------Members----------------------------//
        private String _tag;
        private List<ComparableTrip> _trips;


        public routeComparisionPage()
        {
            this.InitializeComponent();
            this.navigationHelper = new NavigationHelper(this);
        }

        //-----------------Navigation----------------------------//

        public NavigationHelper NavigationHelper
        {
            get { return this.navigationHelper; }
        }

        public ObservableDictionary DefaultViewModel
        {
            get { return this.defaultViewModel; }
        }
      
        protected override void OnNavigatedTo(NavigationEventArgs e)
        {
           
            base.OnNavigatedTo(e);
            _tag = (String)e.Parameter;
            _tagLabel.Text = _tag;

            //load routes for tag
            loadTrips();
        }

        //-----------------private functions----------------------------//

        private void drawTrip(ComparableTrip trip, Color color)
        {
            List<BasicGeoposition> crossings = new List<BasicGeoposition>();
            foreach (var point in trip.points)
            {
                crossings.Add(new BasicGeoposition { Latitude = point.lat, Longitude = point.lon });
            }

            _map.MapElements.Add(
            new MapPolyline
            {
                Path = new Geopath(crossings),
                StrokeThickness = 7,
                StrokeColor = color
            });
        }

        private async void loadTrips()
        {
            // _trips = new List<ComparableTrip>();
            SamComparableTripResonse response = await (App.Current as App).Server.GetTrips(_tag);
            if (response.successfull)
            {
                _trips = response.Trip;
                foreach (var trip in _trips)
                {
                    drawTrip(trip, Colors.Gray);
                }

                //Set ROI in map
                List<BasicGeoposition> crossingCollection = new List<BasicGeoposition>();
                foreach (var trip in _trips)
                {
                    foreach (var point in trip.points)
                    {
                        crossingCollection.Add(new BasicGeoposition { Latitude = point.lat, Longitude = point.lon });
                    }
                }
                _map.TrySetViewBoundsAsync(GeoboundingBox.TryCompute(crossingCollection), null, MapAnimationKind.Bow);


                //Look for most efficient & shortest trip
                int effFuel = (int)_trips[0].totalFuel;
                int effIndex = 0;
                double fastTime = _trips[0].totalTime;
                int fastIndex = 0;

                for (int i = 1; i < _trips.Count; i++)
                {
                    if (effFuel > _trips[i].totalFuel)
                    {
                        effFuel = (int)_trips[i].totalFuel;
                        effIndex = i;
                    }

                    if (fastTime > _trips[i].totalTime)
                    {
                        fastTime = (int)_trips[i].totalTime;
                        fastIndex = i;
                    }
                }

                _fastTitleLabel.Text = "schnellste";
                _effTitelLabel.Text = "effizienteste";

                _effDistance.Text = (_trips[effIndex].totalDistance / 1000).ToString("0.0 km");
                TimeSpan time = new TimeSpan(0, 0, (int)_trips[effIndex].totalTime);
                _effDuration.Text = time.ToString(@"hh\:mm\:ss");
                _effFuel.Text = _trips[effIndex].totalFuel.ToString("0 ml");
                drawTrip(_trips[effIndex], Colors.DarkSeaGreen);


                if (fastIndex == effIndex)
                {
                    _fastTitleLabel.Text = "";
                    _effTitelLabel.Text = "effizienteste & schnellste";
                }
                else
                {
                    drawTrip(_trips[fastIndex], Colors.DodgerBlue);

                    _fastDistance.Text = (_trips[fastIndex].totalDistance / 1000).ToString("0.0 km");
                    time = new TimeSpan(0, 0, (int)_trips[fastIndex].totalTime);
                    _fastDuration.Text = time.ToString(@"hh\:mm\:ss");
                    _fastFuel.Text = _trips[fastIndex].totalFuel.ToString("0 ml");
                }
            }
            else
            {
                var dialog = new MessageDialog(response.ErrorMessage);
                dialog.Commands.Add(new UICommand("ok"));
                await dialog.ShowAsync();
            }
        }
    }
}
