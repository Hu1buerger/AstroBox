/*
 *  (c) AstroPrint Product Team. 3DaGoGo, Inc. (product@astroprint.com)
 *
 *  Distributed under the GNU Affero General Public License http://www.gnu.org/licenses/agpl.html
 */

// ONLY FOR TESTING
const access_token = "";

 //~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PrintFile
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var PrintFile = Backbone.Model.extend({
  defaults: {
    name: '',
  },
  url: null,
  initialize: function(box) {
    this.url = box ? '/ajax/printqueues/'+box.id : "";
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PrintFiles
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var PrintFiles = Backbone.Collection.extend({
  model: PrintFile,
  url: null,
  type: "later",
  initialize: function(models, status)
  {
    // URL
    if (status) {
      this.type = status;
      this.url  = '/ajax/printqueues/6c5327d28ee1483996d32989dafa316e/printfiles';
    }
    // COMPARATOR
    if (status == "pending") {
      this.comparator = "pos"
    } else {
      this.comparator = function(m){
        return -Date.parse(m.get('last_status_time')) * 1000;
      }
    }
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DeleteQueueElementDialog
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var DeleteQueueElementDialog = Backbone.View.extend({
  el: '#delete-queue-element-dlg',
  queueFile: null,
  mainView: null,
  events: {
    "click .confirm-button": "doDelete",
    "click button.cancel": "doCancel",
    'closed.fndtn.reveal': 'onClosed'
  },
  render: function ()
  {
    this.$('.filename').text(this.queueFile.get('name'));
  },
  open: function (params)
  {
    this.queueFile = params.printFile;
    this.mainView = params.parent.mainView;

    this.mainView.waitToSync = true;

    this.render();
    this.$el.foundation('reveal', 'open');
  },

  doDelete: function (e)
  {
    var loadingBtn = this.$('.confirm-button');
    loadingBtn.addClass('loading');

      // Temporary fix to avoid x-api-key
      $.ajaxSetup({
        headers: null
      });
      $.ajax({
        url: "http://api.astroprint.test/v2/print-queues/"+this.queueFile.get('id'),
        method: "DELETE",
        contentType: "application/x-www-form-urlencoded",
        headers: {
          'authorization': 'Bearer '+ access_token
        }
      })
        .done(_.bind(function () {
          loadingBtn.removeClass('loading');
          this.$el.foundation('reveal', 'close');

          var collection = this.queueFile.collection;

          if (collection) {
            collection.remove(this.queueFile)
          }

        }, this))
        .fail(function (e) {
          console.error('Delete operation failed');
          loadingBtn.removeClass('loading').addClass('failed');
          setTimeout(function () {
            loadingBtn.removeClass('failed');
          }, 2000);
        })
        .always(function () {
          $.ajaxSetup({
            headers: { "X-Api-Key": UI_API_KEY }
          });
        });
    /* this.printFile.destroy({
      wait: true,
      url: '/ajax/printqueues/' + this.printFile.get('id'),
      success: _.bind(function () {
        loadingBtn.removeClass('loading');
        this.$el.foundation('reveal', 'close');
      }, this),
      error: _.bind(function () {
        console.error('Delete operation failed');
        loadingBtn.removeClass('loading').addClass('failed');
        setTimeout(function () {
          loadinBtn.removeClass('failed');
        }, 2000);
      }, this)
    }); */
  },

  doCancel: function ()
  {
    this.$el.foundation('reveal', 'close');
  },
  onClosed: function ()
  {
    setTimeout(_.bind(function () {
      this.mainView.waitToSync = false;
    }, this), 1000);
    this.undelegateEvents();
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ClearQueueDialog
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var ClearQueueDialog = Backbone.View.extend({
  el: '#clear-finished-dlg',
  status: null,
  events: {
    "click .confirm-button": "doDelete",
    "click button.cancel": "doCancel",
    'closed.fndtn.reveal': 'onClosed'
  },
  render: function ()
  {
    this.$('.status-label').text(this.status);
  },
  open: function (params)
  {
    this.status = params.status;
    this.view = params.view;
    this.view.mainView.waitToSync = true;

    this.render();
    this.$el.foundation('reveal', 'open');
  },

  doDelete: function (e)
  {
    this.$('.confirm-button').addClass('loading');

    this.view.synchronizeQueue()
      .done(_.bind(function () {
        this.destroyFiles();
      }, this));
  },

  destroyFiles: function () {
    var loadingBtn = this.$('.confirm-button');


    $.ajaxSetup({
      headers: null
    });

    $.ajax({
      url: 'http://api.astroprint.test/v2/devices/b7f3a5af91135619bcb5da0d2d06a244/print-queue',
      method: 'DELETE',
      type: 'json',
      data: JSON.stringify({"status": this.status}),
      contentType: "multipart/form-data",
      headers: {
        'authorization': 'Bearer '+ access_token
      }
    })
      .done(_.bind(function () {
        if (status == "finished") {
          this.view.finishedFiles.reset();
        } else {
          this.view.pendingFiles.reset();
        }
        loadingBtn.removeClass('loading');
        this.$el.foundation('reveal', 'close');
      }, this))
      .fail(_.bind(function () {
        loadingBtn.removeClass('loading').addClass('failed');
        setTimeout(function () {
          loadingBtn.removeClass('failed');
        }, 2000);
        console.error('Delete operation failed');
      }, this));
  },

  doCancel: function ()
  {
    this.$el.foundation('reveal', 'close');
  },

  onClosed: function ()
  {
    this.view.mainView.waitToSync = false;
    this.undelegateEvents();
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// DownloadElementDialog
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var DownloadElementDialog = Backbone.View.extend({
  el: '#print-element-dlg',
  cloudFileID: null,
  mainView: null,
  events: {
    "click a.cancel": "cancelDownloadClicked",
    'closed.fndtn.reveal': 'onClosed'
  },
  render: function ()
  {
    app.eventManager.on('astrobox:cloudDownloadEvent', this.onDownloadProgress, this);
  },
  open: function (params)
  {
    this.cloudFileID = params.queueElement.get('printfile_id');
    this.queueElementID = params.queueElement.get('id');
    this.mainView = params.mainView;

    this.mainView.waitToSync = true;
    this.render();
    this.startProccess();
    this.$el.foundation('reveal', 'open');
  },
  doClose: function ()
  {
    this.$el.foundation('reveal', 'close');
  },

  cancelDownloadClicked: function (e)
  {
    e.preventDefault();
    $.ajax({
      url: '/api/astroprint/print-files/' + this.cloudFileID + '/download',
      method: 'DELETE'
    })
      .fail(function () {
        noty({ text: "Unable to cancel download.", timeout: 3000 });
      });
  },

  onDownloadProgress: function(data)
  {
    if (data.id == this.cloudFileID ) {
      switch (data.type) {
        case 'progress':
          {
            var progressContainer = this.$('.progress-container');
            var progress = data.progress

            progressContainer.find('.progress-label').html(progress + '%');
            progressContainer.find('.meter').width(progress);
          }
          break;

        case 'success':
          {
            this.mainView.trigger("start-print", {filename: data.filename, queueElementID: this.queueElementID});
            this.doClose();
          }
          break;

        case 'error':
          {
            this.doClose();
            noty({text: "There was an error downloading the file.", timeout: 3000});
          }
          break;

        case 'cancelled':
          {
            this.doClose();
          }
          break;
      }
    }
  },

  startProccess: function ()
  {
    $.getJSON('/api/astroprint/print-files/'+this.cloudFileID+'/download')
    .fail(function(){
      noty({text: "There was an error starting the download.", timeout: 3000});
      this.doClose();
    });
  },

  onClosed: function ()
  {
    this.undelegateEvents();
    this.stopListening();

    this.mainView.waitToSync = false;
    var progressContainer = this.$('.progress-container');

    setTimeout(function () {
      progressContainer.find('.progress-label').html('0%');
      progressContainer.find('.meter').width(0);
    }, 1000);

    app.eventManager.off('astrobox:cloudDownloadEvent', this.onDownloadProgress, this);
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// Side Menu
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var SideMenuView = Backbone.View.extend({
  el: '#user-side-menu-container',
  mainView: null,
  events: {
    "click a.item": "clickTab"
  },
  initialize: function (mainView)
  {
    this.mainView = mainView;
    var tabDefault = this.$('a[data-tab="printQueues"]');

    tabDefault.addClass('active');
    this.mainView.manageTabs(tabDefault);
  },
  clickTab: function (e)
  {
    e.preventDefault();
    var activeTab = $(e.currentTarget).closest('a');
    this.changeActiveTab(activeTab);
  },
  changeActiveTab: function(activeTab)
  {
    this.$('a').not(activeTab).removeClass('active');
    activeTab.addClass('active');
    this.mainView.manageTabs(activeTab);
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PrintFileRowView
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var PrintFileRowView = Backbone.View.extend({
  className: 'print-file-row row small-collapse',
  parent: null,
  printFile: null,
  template: _.template($("#print-file-row-template").html()),
  initialize: function (params)
  {
    this.parent = params.parent ? params.parent : params.laterContainer;
    this.printFile = params.printFile;
    this.$el.attr('id', this.printFile.get('id'));
    if (this.printFile.get('info')) {
      this.printFile.set('printTimeLeft', this._formatTime(this.printFile.get('info')['print_time']));
    }
  },
  render: function (view)
  {
    // We pass the view to keep its class style
    var ownView = this;
    if (view) {
      ownView = view;
    } else {
      this.$el.empty();

      ownView.$el.html(ownView.template({
        view: ownView,
        pf: ownView.printFile.toJSON()
      }));
    }

    ownView.delegateEvents({
      'click .icon-folder': function () { this.movePrintFile('up'); },
      'click .icon-move': function () { this.movePrintFile('down'); },
      'click .icon-th': function () { this.movePrintFile('top'); },
      'click .delete-printFile': 'deletePrintFile',
      'click .print-actions button.print': 'dropdownPrint',
      'click .print-actions a.queue': 'addToQueue',
      'click .return-button': 'returnToQueue'
    });

    $.localtime.format(this.$('.time-container'));

    return ownView;
  },

  dropdownPrint: function (e)
  {
    if (!$(e.target).hasClass('arrow-drop')) {
      this.printNow(e);
    }
  },

  printNow: function (e)
  {
    e.preventDefault();
    this.parent.trigger("print-clicked", { button: $(e.target), queueElement : this.printFile });
  },

  addToQueue: function (e)
  {
    e.preventDefault();
    $.ajaxSetup({
      headers: null
    });

    $.ajax({
      url: "http://api.astroprint.test/v2/print-queues",
      method: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify({
        "printfile_id" : this.printFile.get('printfile_id'),
        "device_id" : "b7f3a5af91135619bcb5da0d2d06a244"}),
      headers: {
        'authorization': 'Bearer ' + access_token
      }
    })
      .done(_.bind(function () {
        noty({text: "File successfully added to the queue", type: 'success', timeout: 3000});
      }, this))
      .fail(function (e) {
        noty({text: "File failed to be added to the queue", timeout: 3000});
        console.error(e);
      })
      .always(function () {
        $.ajaxSetup({
          headers: { "X-Api-Key": UI_API_KEY }
        });
      });
  },

  // Move a file from finished back to queue again as ready
  returnToQueue: function ()
  {
    var newPos = this._microtime(true);

    $.ajaxSetup({
      headers: null
    });

    $.ajax({
      url: "http://api.astroprint.test/v2/print-queues/" + this.printFile.get('id'),
      method: "PATCH",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify({ "pos" : newPos, "status" : "ready"}),
      headers: {
        'authorization': 'Bearer ' + access_token
      }
    })
      .done(_.bind(function () {
        this.printFile.set({
          "pos" : newPos,
          "status" : "ready"
        },
        {silent:  true}
        );
        this.parent.updateQueue();
      }, this))
      .fail(function (e) {
        console.error(e);
      })
      .always(function () {
        $.ajaxSetup({
          headers: { "X-Api-Key": UI_API_KEY }
        });
      });
  },

  // Move up/down printfile row
  movePrintFile: function (direction)
  {
    this.parent.mainView.waitToSync = true;
    var readyCollection = this.printFile.collection;
    var arrowIconClass = (direction != "top") ? ".icon-" + direction + "-open" : ".icon-step-forward";
    var indexTo;

    if (!this.$(arrowIconClass).hasClass('off')) {
      if (direction == "up" || direction == "down") {
        var incrementalValue = (direction == "up") ? -1 : 1;
        var indexFrom = Number(readyCollection.indexOf(this.printFile));

        indexTo = Number(indexFrom + incrementalValue);
        var modelTo = readyCollection.at(indexTo);

        $.ajaxSetup({
          headers: null
        });
        $.ajax({
          url: "http://api.astroprint.test/v2/print-queues/"+this.printFile.get('id')+"/swap-positions",
          method: "PATCH",
          dataType: "json",
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify({"elementqueue_id": modelTo.get('id')}),
          headers: {
            'authorization': 'Bearer ' + access_token
          }
        })
          .done(_.bind(function () {
            // Movement Animation
            if (direction == 'up') { this.$el.addClass('animated slideOutUp'); } else { this.$el.addClass('animated slideOutDown'); }
            setTimeout(_.bind(function () {
              this.parent.mainView.boxView.trigger("sync-app");
            }, this), 200);
          }, this))
          .fail(function (e) {
            console.error(e);
          })
          .always(_.bind(function () {
            this.parent.mainView.waitToSync = false;
            $.ajaxSetup({
              headers: { "X-Api-Key": UI_API_KEY }
            });
          }, this));
      } else {
        var previousFileOnTop = readyCollection.first();
        indexTo = Number(readyCollection.indexOf(previousFileOnTop));
        $.ajaxSetup({
          headers: null
        });
        $.ajax({
          url: "http://api.astroprint.test/v2/print-queues/"+this.printFile.get('id'),
          method: "PATCH",
          dataType: "json",
          contentType: "application/json; charset=UTF-8",
          data: JSON.stringify({"pos": Number(previousFileOnTop.get('pos')) - 1000 }),
          headers: {
            'authorization': 'Bearer ' + access_token
          }
        })
          .done(_.bind(function () {
            this.printFile.set("pos", Number(previousFileOnTop.get('pos')) - 1000, { silent: true });

            // Movement animation
            this.$el.addClass('animated fadeOutUpBig');
            this.$el.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () { this.$el.removeClass('fadeOutUpBig');this.parent.$el.find('.pending-files-box').animate({ scrollTop: 0 }, "normal"); }.bind(this));

            // After animation => remove/add
            setTimeout(_.bind(function () {
              this.parent.mainView.boxView.trigger("sync-app");
            }, this), 200);
          }, this))
          .fail(function (e) {
            console.error(e);
          })
          .always(_.bind(function () {
            $.ajaxSetup({
              headers: { "X-Api-Key": UI_API_KEY }
            });
            this.parent.mainView.waitToSync = false;
          }, this));

        /* this.printFile.save({ pos: Number(previousFileOnTop.get('pos')) - 1000 }, {
          patch: true, silent: true, wait: true, url: '/ajax/printqueues/' + this.printFile.get('id'),
          success: _.bind(function (e) {
            // Movement animation
            this.$el.addClass('animated fadeOutUpBig');
            this.$el.one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function () { this.$el.removeClass('fadeOutUpBig'); }.bind(this));

            // After animation => remove/add
            setTimeout(_.bind(function () {
              readyCollection.remove(this.printFile, { silent: true });
              readyCollection.add(this.printFile, { at: indexTo }); // triger change
              this.parent.$el.find('.pending-files-box').animate({ scrollTop: 0 }, "normal");
            }, this), 200);
          }, this),
          error: _.bind(function (e) {
            console.error("Error saving new position to file", e);
          }, this)
        }); */
      }
    }
  },

  deletePrintFile: function (e)
  {
    e.preventDefault();
    (new DeleteQueueElementDialog()).open(this);
  },

  _swapFileClass: function (className)
  {
    var classes = ["finished-printing", "failed-printing", "canceled-printing"];
    for (var i = 0; i < classes.length; i++) {
      if (classes[i] != className) {
        this.$el.removeClass(classes[i]);
      }
    }

    this.$('.time-status').html("23 December 2012")
    this.$el.addClass(className);
  },

  // When the printFile back to ready status
  _clearClasses: function ()
  {
    // Remove special box clases
    var elementParent = this.parent.$el;
    var boxClasses = ["not-ready", "disconnected"];

    for (var i = 0; i < boxClasses.length; i++) {
      elementParent.removeClass(boxClasses[i]);
    }

    var pFileClasses = ["finished-printing", "failed-printing"];
    // Remove special file clases
    for (var i = 0; i < pFileClasses.length; i++) {
      this.$el.removeClass(pFileClasses[i]);
    }
  },

  _formatTime: function (seconds)
  {
    var sec_num = parseInt(seconds, 10); // don't forget the second param
    var hours = Math.floor(sec_num / 3600);
    var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
    seconds = sec_num - (hours * 3600) - (minutes * 60);

    if (hours < 10) { hours = "0" + hours; }
    if (minutes < 10) { minutes = "0" + minutes; }
    if (seconds < 10) { seconds = "0" + seconds; }
    return [hours, minutes, seconds];
  },

  // Get current time in ms, like PHP microtime
  _microtime: function (get_as_float)
  {
    var unixtime_ms = (new Date).getTime();
    var sec = Math.floor(unixtime_ms / 1000);

    return get_as_float ? (unixtime_ms / 1000) : (unixtime_ms - (sec * 1000)) / 1000 + ' ' + sec;
  },

});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// BoxesContainerView
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var BoxContainerView = Backbone.View.extend({
  el: '#box-container',
  box: null,
  allPrintFiles: [],
  pendingFiles: null,
  pendingFiles_views: [],
  finishedFiles: null,
  finishedFiles_views: [],
  activeFile_view: null,
  updateFrequency: 8000,
  syncInterval: null,
  mainView: null,
  activeTab: "pending-tab",
  events: {
    'click .print-next': 'printQueue',
    'click .connect-label': 'connectPrinter',
    'click .clear-pending-button': 'clearPending',
    'click .clear-finished-button': 'clearFinished',
    'click .shownByContainer button': 'printFilesFilterChanged'
  },
  onShow: function()
  {
     // pending files
     //this.listenTo(this.pendingFiles, 'add', this.boxFileAdded);
     this.listenTo(this.pendingFiles, 'remove', this.boxFileRemoved);
     this.listenTo(this.pendingFiles, 'reset',  function(collection, filesRemoved){this.boxFilesReset("pending", collection, filesRemoved)}.bind(this));

     // finished files
     this.listenTo(this.finishedFiles, 'remove', this.boxFileRemoved);
     this.listenTo(this.finishedFiles, 'reset',  function(collection, filesRemoved){this.boxFilesReset("finished", collection, filesRemoved)}.bind(this));

     this.listenTo(app.socketData, 'change:printer', this.operationalChanged);
     this.keepQueueUpdated();
  },

  onHide: function()
  {
    this.stopListening();
    clearInterval(this.syncInterval);
  },

  initialize: function (params) {
    this.pendingFiles = new PrintFiles ([], 'pending');
    this.finishedFiles = new PrintFiles ([], 'finished');

    this.mainView = params.mainView;
    this.updateQueue();
  },

  clearPending: function (e) {
    e.preventDefault();
    (new ClearQueueDialog()).open({view: this, status : "pending"});
  },

  clearFinished: function (e) {
    e.preventDefault();
    (new ClearQueueDialog()).open({view: this, status : "finished"});
  },

  keepQueueUpdated: function() {
    this.syncInterval = setInterval(_.bind(function () {
      this.trigger("sync-app");
    }, this), this.updateFrequency);
  },

  boxFilesReset: function (type ,collection, filesRemoved)
  {
    filesRemoved.previousModels.forEach(_.bind(function(f) {
      this.boxFileRemoved(f,type)
    },this));
  },

  boxFileRemoved: function(removedFile, cn)
  {
    var collectionType = (typeof cn === "string") ? cn : cn.type ;
    var file_views = {};

    if (collectionType == "pending") {
      file_views = this.pendingFiles_views;
    } else if (collectionType == "finished") {
      file_views = this.finishedFiles_views;
    }

    var boxFileId = removedFile.get('id');
    // delete pfile row on array-view if exists
    if (_.has(file_views, boxFileId)) {

     // Animation
     file_views[boxFileId].$el.addClass('animated zoomOutRight');

      // After animation, remove it
      setTimeout(_.bind(function () {
        if (file_views[boxFileId]) {
          file_views[boxFileId].remove();
          delete file_views[boxFileId];
        }
      }, this), 3000);
      this.updateCounters();
      this.checkMoveIcons();
    } else {
      console.warn('BoxRowV: Attempt to delete printFile view [' + boxFileId + '] when it wasn\'t there');
    }
  },

  operationalChanged: function(model, data)
  {
    if  (data.status == "connected") {
      this._clearBoxClasses();
    } else {
      this._swapBoxClass("not-ready")
    }
  },

  updateQueue: function()
  {
    this.synchronizeQueue()
    .done(_.bind(function (filesQueues) {
      if (filesQueues) {
        this.allPrintFiles = filesQueues;
        // Pending and Finished collections
        this.pendingFiles.reset(_.filter(filesQueues, function(pf){ return pf.status == "ready" }), {silent: true})
        this.finishedFiles.reset(_.filter(filesQueues, function(pf){ return pf.status != "ready" && pf.status != "printing" }),{silent: true});

        this.insertPrintFiles();
        this.updateActiveFileArea();
        this.checkMoveIcons();
        this.updateCounters();
      }
    }, this));
  },

  updateActiveFileArea: function ()
  {
    // Remove active-file-area
    if (this.activeFile_view) {
      this.activeFile_view.remove();
      delete this.activeFile_view;
    }

    // Add active-file-area view only if there are pending files
    if (this.pendingFiles.length > 0) {
      this.activeFile_view = new ActiveFileAreaRowView({ printFile: this.pendingFiles.first() });
      this.$('.active-file-area').empty();
      this.$('.active-file-area').append(this.activeFile_view.render().el);
    }

  },

  printQueue: function(e) {
    e.preventDefault();
    this.trigger('print-clicked', {button: $(e.target).parent(), queueElement: this.pendingFiles.first()});
  },

  // Add row printfiles into box collection
  insertPrintFiles: function ()
  {
    // pending files
    _.each(this.pendingFiles_views, function (pf) {
      pf.remove();
    });
    this.pendingFiles_views = {};

    var container = this.$('.pending-files-box');

    this.pendingFiles.each(function (pf) {
      var row = new PrintFileRowView({
        printFile: pf,
        parent: this
      });

      this.pendingFiles_views[pf.get('id')] = row;
      this.matchFileToPrinterStatus(row);
      container.append(row.render().el);
    }, this);

    // finished
    _.each(this.finishedFiles_views, function (pf) {
      pf.remove();
    });
    this.finishedFiles_views = {};

    var container = this.$('.finished-files-box');

    this.finishedFiles.each(function (pf) {
      var row = new PrintFileRowView({
        printFile: pf,
        parent: this
      });

      this.finishedFiles_views[pf.get('id')] = row;
      this.matchFileToPrinterStatus(row);
      container.append(row.render().el);
    }, this);
    $(document).foundation('dropdown', 'reflow');
  },

  // Apply style per printfile row
  matchFileToPrinterStatus: function (printFileRow)
  {
    var printFileModel = printFileRow.printFile;

    // If the printFile appear as printing, check printer
    if (printFileModel.get('status') == "printing") {
      if (!app.socketData.get('printing') &&  !app.socketData.get('paused')) {
        printFileModel.save({ status: "failed" }, {
          patch: true, wait: true,
          success: _.bind(function () {
            printFileRow.$el.addClass('failed-printing');
          }, this),
          error: _.bind(function (e) {
            console.error(e);
          }, this)
        });
      }

    } else if (printFileModel.get('status') == "failed") {
      printFileRow.$el.addClass('failed-printing');
    } else if (printFileModel.get('status') == "finished") {
      printFileRow.$el.addClass('finished-printing');
    } else if (printFileModel.get('status') == "canceled") {
      printFileRow.$el.addClass('canceled-printing');
    }
  },

  // Check first/last ready file and ready/finished messages
  checkMoveIcons: function ()
  {
    /* Ready files */
    if (this.pendingFiles.length > 0) {
      this.$('.print-button').removeClass('inactive');

      // Hide message no ready-files
      this.$el.removeClass('no-ready-files');

      if (this.pendingFiles.length > 0) {

        var firstModel = this.pendingFiles.first();
        var viewFirst = this.pendingFiles_views[firstModel.get('id')];
        viewFirst.$('.icon-up-open, .icon-step-forward').addClass('off');

        var lastModel = this.pendingFiles.last();
        var viewLast = this.pendingFiles_views[lastModel.get('id')];
        viewLast.$('.icon-down-open').addClass('off');

        this.updateActiveFileArea();
      }

      // Case Example: Sent last ready file to print / Remove last ready file
    } else {
      this.$el.addClass('no-ready-files');
    }

    /* Finished files */
    if (this.finishedFiles.length > 0) {
      this.$el.removeClass('no-finished-files');
    } else {
      this.$el.addClass('no-finished-files');
    }
    this.updateIndexQueues();
  },

  updateIndexQueues: function () {
    var i = 1;
    this.pendingFiles.each(function (pf, pos) {
      this.pendingFiles_views[pf.id].$('.index-queue').html(i)
      i++;
    }, this);
  },

  synchronizeQueue: function()
  {
    var promise = $.Deferred();

    this.loadQueues()
    .done(_.bind(function(data){
      this.box = data;
      if (!data) {
        this.$el.addClass("no-ready-files");
        this.$el.addClass("no-finished-files");
      } else {
        this.$el.removeClass("no-ready-files");
        this.$el.removeClass("no-finished-files");
        if (app.socketData.get('printer').status !== "connected") {
          this._swapBoxClass('not-ready');
        }
      }
      promise.resolve(data ? data.queue: null);
    },this))
    .fail(function(e){
      console.error(e);
      promise.reject(e);
        noty({text: "There was an error loading the print queue", timeout: 3000});
    });

    return promise;
  },

  updateCounters: function()
  {
    var counter = {
      "ready": this.pendingFiles ? this.pendingFiles.length : 0,
      "finished": this.finishedFiles ? this.finishedFiles.length : 0
    }

    this.$el.find('.ready-counter-label').html(counter.ready);
    this.$el.find('.finished-counter-label').html(counter.finished);
  },

  loadQueues: function()
  {
    var promise = $.Deferred();

    // Temporary fix to avoid x-api-key
    $.ajaxSetup({
      headers: null
    });

    $.ajax({
      url: "http://api.astroprint.test/v2/devices/b7f3a5af91135619bcb5da0d2d06a244/print-queue",
      method: "GET",
      contentType: "application/x-www-form-urlencoded",
      headers: {
        'authorization': 'Bearer '+ access_token
      }
    })
      .done(_.bind(function (data) {
        promise.resolve(data);
      }, this))
      .fail(function (e) {
        promise.reject(e);
      })
      .always(function () {
        $.ajaxSetup({
          headers: { "X-Api-Key": UI_API_KEY }
        });
      });

      return promise;
  },

  // Called from shownby on change
  printFilesFilterChanged: function (e)
  {
    var button = this.$(e.target).closest('button');

    if (button.hasClass('pending-tab')) {
      if (this.activeTab != "pending-tab") {
        this.activeTab = "pending-tab";
        button.addClass('is-active');
        this.$('.completed-tab').removeClass('is-active')
      }
    } else {
      if (this.activeTab != "completed-tab") {
        this.activeTab = "completed-tab";
        button.addClass('is-active');
        this.$('.pending-tab').removeClass('is-active')
      }
    }

    // FINISHED FILES
    if (this.activeTab == "completed-tab") {
      this.$el.addClass('filter-finished');
      this.$el.removeClass('filter-ready');
      // ON QUEUE FILES
    } else {
      this.$el.addClass('filter-ready');
      this.$el.removeClass('filter-finished');
    }
  },

  _swapBoxClass: function (className)
  {
    var boxClasses = ["not-ready", "disconnected"];

    for (var i = 0; i < boxClasses.length; i++) {
      if (boxClasses[i] != className) {
        this.$el.removeClass(boxClasses[i]);
      }
    }
    this.$el.addClass(className);
  },

  _clearBoxClasses: function ()
  {
    var boxClasses = ["not-ready", "disconnected"];

    for (var i = 0; i < boxClasses.length; i++) {
      this.$el.removeClass(boxClasses[i]);
    }
  },

  boxFileAdded: function()
  {

    var container = this.$('.pending-files-box');
    container.empty();

      this.pendingFiles.each(function (pf) {
        var row = new PrintFileRowView({ printFile: pf, parent: this });
        this.pendingFiles_views[pf.get('id')] = row;
        this.matchFileToPrinterStatus(row);
        container.append(row.render().el);
      }, this);

      this.checkMoveIcons();
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PrintLaterContainerView
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var PrintLaterContainerView = Backbone.View.extend({
  el: '#print-later-list',
  printLaterFiles: [],
  printLaterFile_views: {},
  initialize: function (params)
  {
    this.mainView = params.mainView;

    this.updateLaterFiles();
    this.printLaterFiles = new PrintFiles();
  },

  onShow: function()
  {
    this.listenTo(app.socketData, 'change:printer', this.operationalChanged);
    this.listenTo(this.printLaterFiles, 'remove', this.remove);
  },

  onHide: function()
  {
    this.stopListening();
  },

  operationalChanged: function(model, data)
  {
    var status = data.status;
    if  (status == "connected") {
      this.$el.removeClass("not-ready");
    } else {
      this.$el.addClass("not-ready");
    }
  },

  updateLaterFiles: function() {
    this.getPrintLaterFiles()
    .done(_.bind(function (laterFiles) {
      if (laterFiles) {
        this.printLaterFiles.reset(laterFiles)
      }
    }, this))
    .fail(function (e) {
      console.error(e);
    })
    .always(_.bind(function () {
      this.render();
      this.checkNoLaterFiles();
    }, this));
  },


  getPrintLaterFiles: function ()
  {

    var promise = $.Deferred();

    // Temporary fix to avoid x-api-key
    $.ajaxSetup({
      headers: null
    });

    $.ajax({
      url: "http://api.astroprint.test/v2/print-queues/print-later",
      method: "GET",
      contentType: "application/x-www-form-urlencoded",
      headers: {
        'authorization': 'Bearer '+ access_token
      }
    })
      .done(_.bind(function (data) {
        promise.resolve(data);
      }, this))
      .fail(function (e) {
        promise.reject(e);
      })
      .always(function () {
        $.ajaxSetup({
          headers: { "X-Api-Key": UI_API_KEY }
        });
      });

      return promise;
  },

  remove: function (PrintFile)
  {
    var printFileId = PrintFile.get('id');

    if (_.has(this.printLaterFile_views, printFileId)) {

      // Animation
      this.printLaterFile_views[printFileId].$el.addClass('animated bounceOut');

      // After animation, remove it
      setTimeout(_.bind(function () {
        if (this.printLaterFile_views[printFileId]) {
          this.printLaterFile_views[printFileId].remove();
          delete this.printLaterFile_views[printFileId];
        }
      }, this), 650);
      this.checkNoLaterFiles();
    } else {
      console.warn('PrintFileListView: Attempt to delete printFile view [' + printFileId + '] when it wasn\'t there');
    }
  },

  render: function ()
  {
    this.$el.empty();

    if (this.printLaterFiles.length) {
      this.printLaterFiles.each(function (printFile, pos) {
        var row = new PrintFileRowView({ printFile: printFile, laterContainer: this });
        this.printLaterFile_views[printFile.get('id')] = row;
        this.$el.append(row.render().el);
      }, this);
      $(document).foundation('dropdown', 'reflow');
    }
  },

  checkNoLaterFiles: function ()
  {
    var animationTime = 1100;

    setTimeout(_.bind(function () {
      if (this.printLaterFiles.length <= 0) {
        this.$('#no-printFiles').show();
        this.$('#no-printFiles').addClass('animated flipInX');
      }
    }, this), animationTime);

    setTimeout(_.bind(function () {
      this.$('#no-printFiles').removeClass('animated flipInX');
    }, this), animationTime + 1000);

     // update count field
     var countPFilesLater = $('.pFilesCounter');
     countPFilesLater.html(this.printLaterFiles.length);

     $('#printLater-icon').attr('data-badge', this.printLaterFiles.length)
     if (this.printLaterFiles.length) {
       $('#printLater-icon').addClass('badge');
     } else {
       $('#printLater-icon').removeClass('badge');
     }
  }
});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// PrintQueueView
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

var PrintQueueView = Backbone.View.extend({
  el: '#print-queue-view',
  sideMenuView: null,
  boxView: null,
  printLaterView: null,
  currentTabID: null,
  waitToSync: null,
  initialize: function()
  {
    this.delegateEvents({
      "hide": "onHide",
      "show": "onShow"
    })
  },

  hasQueueAccess: function()
  {
    var promise = $.Deferred();

    app.astroprintApi.me()
      .done(function (data) {
        console.log(data)
        // PRODUCTION: var hasQueueAccess = user.plan ? user.plan.queues_allowed : false;
        var hasQueueAccess = true;
        promise.resolve(hasQueueAccess);
      })
      .fail(function (xhr) {
        console.error(xhr.statusText)
        promise.reject(xhr.statusText);
      })

      return promise;
  },

  onShow: function()
  {
    this.$el.removeClass('data-ready');
    this.hasQueueAccess()
    .done(_.bind(function (hasQueueAccess) {
      if (hasQueueAccess) {
        console.log('QUEUE ACCESS',hasQueueAccess);
        if (!this.sideMenuView) {
          this.sideMenuView = new SideMenuView(this);
          this.boxView  = new BoxContainerView({mainView: this});
          this.printLaterView  = new PrintLaterContainerView({mainView: this});
        }

        this.listenTo(this.boxView, 'sync-app', this.updateQueueApp);
        this.listenTo(this.printLaterView, 'sync-app', this.updateQueueApp);

        this.listenTo(this.boxView, 'print-clicked', this.printManagement);
        this.listenTo(this.printLaterView, 'print-clicked', this.printManagement);

        this.listenTo(this, 'start-print', this.doPrint)
        this.boxView.onShow();
        this.printLaterView.onShow();
      } else {
        window.location.replace("https://cloud.astroprint.com/printqueues/info");
      }
    }, this))

    .fail(_.bind(function () {
      noty({ text: "Something went wrong when checking permission to use Queues", timeout: 3000 });
      window.location.href= "#";
    }, this))
    .always(_.bind(function(){
      setTimeout(_.bind(function () {
        this.$el.addClass('data-ready');
      }, this), 500);
    }, this));
  },

  onHide: function ()
  {
    this.stopListening();
    if (this.boxView) {this.boxView.onHide()}
    if (this.printLaterView) {this.printLaterView.onHide();}
  },

  printManagement: function(params)
  {
    var queueElement = params.queueElement;
    var btn = params.button
    $.ajax({
      url: '/api/files',
      type: "GET",
      success: _.bind(function (localFiles) {
        var localFile = this.isLocalFile(localFiles.files, queueElement);

        if (localFile) {
          btn.addClass('loading');
          this.doPrint({printButton: btn, filename: localFile.printFileName, queueElementID: queueElement.get('id')});
        } else {
          if (localFiles.free > queueElement.get('size')) {
            (new DownloadElementDialog()).open({mainView : this, queueElement : queueElement});
          } else {
            noty({ text: "Not enough space to download the file. Remove some local files.", timeout: 5000 });
          }
        }
      }, this),
      error: function () {
        noty({ text: "Error checking local files", timeout: 3000 });
      }
    });
  },

  doPrint: function(data)
  {
    var filename = data.filename;
    var queueElementID = data.queueElementID;
    var printButton = data.printButton;

    $.ajax({
      url: '/api/files/local/' + filename,
      type: "POST",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify({ command: "select", print: true })
    })
      .done(_.bind(function () {
        this.changeQueueElementStatus(queueElementID);
      }, this))
      .fail(function (xhr) {
        var error = null;
        if (xhr.status == 409) {
          error = xhr.responseText;
        }
        noty({ text: error ? error : "There was an error starting the print", timeout: 3000 });
      }).always(_.bind(function () {
        setTimeout(function () {
          if (printButton) {
            printButton.removeClass('loading');
          }
        }, 1000);
      }, this));
  },

  changeQueueElementStatus: function(elementID)
  {
    $.ajaxSetup({
      headers: null
    });

    $.ajax({
      url: "http://api.astroprint.test/v2/print-queues/" + elementID,
      method: "PATCH",
      dataType: "json",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify({"status" : "printing"}),
      headers: {
        'authorization': 'Bearer ' + access_token
      }
    })
      .done(_.bind(function () {
      }, this))
      .fail(function (e) {
        console.error(e);
      })
      .always(function () {
        $.ajaxSetup({
          headers: { "X-Api-Key": UI_API_KEY }
        });
      });
  },

  isLocalFile: function(localFiles, queueElement)
  {
    var result = null;
    localFiles.forEach(function(localFile) {
      if (localFile.printFileName == queueElement.get('name')) {
        result = localFile;
      }
    }.bind(this));

    return result;
  },

  updateQueueApp: function() {
    if (!this.waitToSync) {
      this.boxView.updateQueue();
      this.printLaterView.updateLaterFiles();
    }
  },

  manageTabs: function(tab)
  {
    currentTabID = tab.attr('data-tab');

    if (currentTabID == "printQueues") {
      $('#print-later-list').hide();
      $('#box-container').show();
    } else {
      $('#print-later-list').show();
      $('#box-container').hide();
    }
  }

});

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
// ActiveFileAreaRowView
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
var ActiveFileAreaRowView = Backbone.View.extend({
  className: 'active-file-area-row row small-collapse',
  printFile: null,
  template: _.template($("#active-file-area-template").html()),
  initialize: function (params)
  {
    this.printFile = params.printFile;
    this.$el.attr('id', this.printFile['id']);
  },

  render: function ()
  {
    var html = this.template({ pf: this.printFile.toJSON()});
    this.$el.empty();
    this.$el.html(html);
    return this;
  }
});
