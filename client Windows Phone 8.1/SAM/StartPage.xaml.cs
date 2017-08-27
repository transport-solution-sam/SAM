using SAM.Common;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Devices.Geolocation;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.Graphics.Display;
using Windows.Storage;
using Windows.UI.Popups;
using Windows.UI.ViewManagement;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// Die Elementvorlage "Standardseite" ist unter "http://go.microsoft.com/fwlink/?LinkID=390556" dokumentiert.

namespace SAM
{
    
    public sealed partial class StartPage : Page
    {
        private List<String> _stringTags;
        private NavigationHelper navigationHelper;
        private ObservableDictionary defaultViewModel = new ObservableDictionary();

        //-----------------Members----------------------------//
        List<SamTag> _tags = new List<SamTag>();

        public StartPage()
        {
            this.InitializeComponent();
            this.navigationHelper = new NavigationHelper(this);

            loadTags();
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

        //-----------------User-Events----------------------------//

        private void _trackingButton_Click(object sender, RoutedEventArgs e)
        {
            if (_selectTagBox.SelectedIndex > -1) Frame.Navigate(typeof(connectOBD), _tags[_selectTagBox.SelectedIndex].tag);
            else Frame.Navigate(typeof(connectOBD), _routeNameBox.Text);
        }

        private void _selectTagBox_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_selectTagBox.SelectedIndex > -1)
            {
                _compareRouteButton.IsEnabled = true;
                _routeNameBox.IsEnabled = false;
                _routeNameBox.Text = "";
            }
            else
            {
                _compareRouteButton.IsEnabled = false;
                _routeNameBox.IsEnabled = true;
            }
        }

        private void _compareRouteButton_Click(object sender, RoutedEventArgs e)
        {
            if (_selectTagBox.SelectedIndex > -1) Frame.Navigate(typeof(routeComparisionPage), _tags[_selectTagBox.SelectedIndex].tag);
            else Frame.Navigate(typeof(routeComparisionPage), _routeNameBox.Text);
        }

        //-----------------private functions----------------------------//

        private async void loadTags()
        {
            _selectTagBox.PlaceholderText = "Lade nahgelegene Tags...";
            SamTagResponse response = await (App.Current as App).Server.GetTags();
            var gl = new Geolocator() { DesiredAccuracyInMeters = (20) };
            Geoposition pos = await gl.GetGeopositionAsync();
            _stringTags = new List<String>();
            if(response.successfull)
            {
                _tags = response.Tags;
                foreach (SamTag t in _tags)
                {
                    BasicGeoposition startpos = new BasicGeoposition { Latitude = t.lat, Longitude = t.lon };
                    double distance = Trip.calculateDistanceInM(startpos, pos.Coordinate.Point.Position);
                    if (distance < 500)
                    {
                        _stringTags.Add(t.tag);
                    }
                }
                //if no tags are close to position, display all tagss
                if (_stringTags.Count == 0)
                {
                    foreach (SamTag t in _tags)
                    {
                        _stringTags.Add(t.tag);
                    }
                }

                if (_stringTags.Count > 0)
                {
                    _selectTagBox.IsEnabled = true;
                    _selectTagBox.PlaceholderText = "Oder Tag Auswählen...";
                    _selectTagBox.ItemsSource = _stringTags;
                }
                else
                {

                    _selectTagBox.PlaceholderText = "keine Tags gefunden";
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

    public class SamTag
    {
        public String tag { get; set; }
        public double lon { get; set; }
        public double lat { get; set; }
        public double osmID { get; set; }
    }
}
